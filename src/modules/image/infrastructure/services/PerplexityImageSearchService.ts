import { Result } from '../../../shared/domain/types/Result';
import {
  ImageSearchService,
  ImageSearchQuery,
  ImageSearchResponse,
  ImageSearchResult,
  ImageSearchError
} from '../../domain/ports/ImageSearchService';

/**
 * Perplexity-based Image Search Service
 *
 * Uses Perplexity AI to search for free images or generate image descriptions
 * that can be used with other generation services.
 */
export class PerplexityImageSearchService implements ImageSearchService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchImages(query: ImageSearchQuery): Promise<Result<ImageSearchResponse, ImageSearchError>> {
    const startTime = Date.now();

    try {
      // Use Perplexity to search for free image URLs
      const searchPrompt = this.buildSearchPrompt(query);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at finding free, copyright-free images on the web. Always provide direct image URLs from reputable free image sources like Unsplash, Pixabay, Pexels, etc.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Result.failure({
          code: 'SEARCH_FAILED',
          message: `Perplexity API error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Parse the response to extract image URLs
      const imageResults = this.parseImageResults(content);

      if (imageResults.length === 0) {
        return Result.failure({
          code: 'NO_RESULTS',
          message: 'No free images found for the given prompt',
          details: { perplexityResponse: content }
        });
      }

      const processingTime = Date.now() - startTime;

      return Result.success({
        results: imageResults,
        totalResults: imageResults.length,
        searchQuery: query.prompt,
        processingTime,
        provider: 'perplexity'
      });

    } catch (error) {
      return Result.failure({
        code: 'SEARCH_FAILED',
        message: 'Failed to search images via Perplexity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateImage(prompt: string, style?: string): Promise<Result<ImageSearchResult, ImageSearchError>> {
    try {
      // Use Perplexity to find the best image generation prompt and suggest alternatives
      const generationPrompt = `
I need to generate an image for this description: "${prompt}"

Please help me in two ways:
1. Find me free, copyright-free images that match this description from sources like Unsplash, Pixabay, Pexels with direct image URLs
2. If no perfect matches exist, provide me with a detailed, professional image generation prompt that I could use with DALL-E or Midjourney

Style preference: ${style || 'professional, high-quality'}

Format your response as:
FREE IMAGES FOUND:
[List any direct image URLs found]

GENERATION PROMPT:
[Detailed prompt for AI image generation]
`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at finding free images and creating detailed image generation prompts. Always prioritize finding existing free images first.'
            },
            {
              role: 'user',
              content: generationPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.4,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Result.failure({
          code: 'GENERATION_FAILED',
          message: `Perplexity API error: ${response.status}`,
          details: errorText
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // First try to extract any free images found
      const freeImages = this.parseImageResults(content);
      if (freeImages.length > 0) {
        return Result.success(freeImages[0]); // Return the first free image found
      }

      // If no free images, this would normally call an actual image generation service
      // For now, we'll return a placeholder indicating that generation would be needed
      return Result.failure({
        code: 'GENERATION_FAILED',
        message: 'Image generation not implemented yet. Would need DALL-E or similar service.',
        details: {
          generationPrompt: this.extractGenerationPrompt(content),
          originalPrompt: prompt,
          style: style
        }
      });

    } catch (error) {
      return Result.failure({
        code: 'GENERATION_FAILED',
        message: 'Failed to generate image via Perplexity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getServiceHealth(): Promise<Result<{ isHealthy: boolean; provider: string; responseTime: number }, Error>> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'user',
              content: 'Health check'
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        }),
      });

      const responseTime = Date.now() - startTime;

      return Result.success({
        isHealthy: response.ok,
        provider: 'perplexity',
        responseTime
      });

    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Unknown health check error')
      );
    }
  }

  async getUsageStats(): Promise<Result<{ dailySearches: number; dailyGenerations: number; remainingQuota: number }, Error>> {
    // Perplexity doesn't provide usage stats in the same way
    // This would need to be tracked internally
    return Result.success({
      dailySearches: 0, // Would need internal tracking
      dailyGenerations: 0, // Would need internal tracking
      remainingQuota: 1000 // Default assumption
    });
  }

  private buildSearchPrompt(query: ImageSearchQuery): string {
    return `
Find me free, copyright-free, high-quality images for this description: "${query.prompt}"

Requirements:
- Images must be free to use (Creative Commons Zero, Public Domain, or similar)
- High resolution and professional quality
- From reputable sources like Unsplash, Pixabay, Pexels, etc.
- Provide direct image URLs (ending in .jpg, .png, .webp, etc.)
- ${query.maxResults ? `Maximum ${query.maxResults} results` : 'Up to 5 results'}
- ${query.size === 'large' ? 'Large/high-resolution preferred' : 'Good quality'}

Please format your response with just the image URLs, one per line, like:
https://images.unsplash.com/photo-123.jpg
https://cdn.pixabay.com/photo-456.jpg

Only include working, direct image URLs from free image sources.
`;
  }

  private parseImageResults(content: string): ImageSearchResult[] {
    const results: ImageSearchResult[] = [];

    // Extract URLs that look like image URLs
    const urlRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif)/gi;
    const urls = content.match(urlRegex) || [];

    // Filter and validate URLs from known free image sources
    const trustedSources = [
      'unsplash.com',
      'pixabay.com',
      'pexels.com',
      'freepik.com',
      'burst.shopify.com',
      'stockvault.net',
      'picjumbo.com'
    ];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const isTrustedSource = trustedSources.some(source => urlObj.hostname.includes(source));

        if (isTrustedSource) {
          results.push({
            url: url,
            source: urlObj.hostname,
            copyrightStatus: 'free',
            format: url.split('.').pop()?.toLowerCase() || 'jpg'
          });
        }
      } catch {
        // Invalid URL, skip
        continue;
      }
    }

    return results.slice(0, 10); // Limit to 10 results
  }

  private extractGenerationPrompt(content: string): string {
    // Try to extract the generation prompt from the response
    const match = content.match(/GENERATION PROMPT:\s*(.+?)(?:\n\n|$)/is);
    return match ? match[1].trim() : content;
  }
}