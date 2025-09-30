import { Result } from '../../../shared/domain/types/Result';
import {
  ImageGenerationService,
  ImageGenerationRequest,
  GeneratedImageResponse,
  ImageGenerationError
} from '../../domain/ports/ImageGenerationService';

/**
 * DALL-E Image Generation Service Implementation
 *
 * Handles AI image generation using OpenAI's DALL-E 3 model
 */
export class DalleImageGenerationService implements ImageGenerationService {
  private readonly openaiApiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1/images/generations';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openaiApiKey = apiKey;
  }

  async generateImage(request: ImageGenerationRequest): Promise<Result<GeneratedImageResponse, ImageGenerationError>> {
    try {
      // Build optimized prompt
      const prompt = this.buildPrompt(request.title, request.content, request.aiPrompt);

      console.log(`🎨 [DALL-E] Generating image for article ${request.articleId}`);
      console.log(`🎨 [DALL-E] Prompt: "${prompt}"`);

      // Call OpenAI DALL-E API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: request.size || '1792x1024',
          quality: 'standard',
          style: request.style || 'natural',
          response_format: 'url'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [DALL-E] API Error:`, errorData);

        return Result.failure({
          code: 'API_ERROR',
          message: `DALL-E API error: ${response.status} ${response.statusText}`,
          details: errorData
        });
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        return Result.failure({
          code: 'API_ERROR',
          message: 'DALL-E did not return any images',
          details: data
        });
      }

      const generatedImage = data.data[0];
      const dimensions = this.parseDimensions(request.size || '1792x1024');

      const result: GeneratedImageResponse = {
        url: generatedImage.url,
        revisedPrompt: generatedImage.revised_prompt,
        width: dimensions.width,
        height: dimensions.height,
        format: 'png'
      };

      console.log(`✅ [DALL-E] Image generated successfully: ${result.url}`);
      return Result.success(result);

    } catch (error) {
      console.error('❌ [DALL-E] Generation error:', error);

      return Result.failure({
        code: 'NETWORK_ERROR',
        message: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async testConnection(): Promise<Result<{ available: boolean; model: string }, ImageGenerationError>> {
    try {
      // Test with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
      });

      if (!response.ok) {
        return Result.failure({
          code: 'API_ERROR',
          message: `OpenAI API connection failed: ${response.status}`,
          details: response.statusText
        });
      }

      return Result.success({
        available: true,
        model: 'dall-e-3'
      });

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: 'Failed to test OpenAI connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  buildPrompt(title: string, content?: string, customPrompt?: string): string {
    // Use custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      return this.optimizePrompt(customPrompt);
    }

    // Extract main concepts from title
    const mainConcepts = this.extractMainConcepts(title);

    // Build descriptive prompt
    let prompt = `A professional, high-quality image representing: ${mainConcepts}`;

    // Add content context if available
    if (content) {
      const contentKeywords = this.extractContentKeywords(content);
      if (contentKeywords.length > 0) {
        prompt += `, incorporating themes of ${contentKeywords.slice(0, 2).join(' and ')}`;
      }
    }

    prompt += '. Professional style, clean composition, suitable for article featured image.';

    return this.optimizePrompt(prompt);
  }

  private optimizePrompt(prompt: string): string {
    let optimized = prompt.trim();

    // Ensure prompt is descriptive and within DALL-E limits
    if (!optimized.includes('high quality') && !optimized.includes('professional')) {
      optimized += ', high quality, professional';
    }

    // Limit to DALL-E max prompt length (around 400 characters)
    if (optimized.length > 400) {
      optimized = optimized.substring(0, 397) + '...';
    }

    return optimized;
  }

  private extractMainConcepts(title: string): string {
    const stopWords = [
      'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'dei', 'delle', 'del', 'della',
      'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'e', 'o', 'ma',
      'che', 'se', 'come', 'quando', 'dove', 'perché', 'cosa', 'tutto', 'tutti',
      'molto', 'più', 'anche', 'solo', 'ancora', 'già', 'sempre', 'mai'
    ];

    const keywords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 4); // Take first 4 keywords

    return keywords.join(' ');
  }

  private extractContentKeywords(content: string): string[] {
    if (!content || content.length < 50) return [];

    const stopWords = [
      'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'dei', 'delle', 'del', 'della',
      'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'e', 'o', 'ma',
      'che', 'se', 'come', 'quando', 'dove', 'perché'
    ];

    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 3);
  }

  private parseDimensions(size: string): { width: number; height: number } {
    const [width, height] = size.split('x').map(Number);
    return { width, height };
  }
}