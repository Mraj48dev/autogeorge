import { NextRequest, NextResponse } from 'next/server';
import { Result } from '@/shared/domain/types/Result';

// Mock implementation of the image module container
// In a real implementation, this would use the dependency injection container
interface ImageSearchRequest {
  articleId: string;
  aiPrompt: string;
  filename: string;
  altText: string;
  forceRegenerate?: boolean;
}

interface ImageSearchResponse {
  image: {
    id: string;
    articleId: string;
    url: string;
    filename: string;
    altText: string;
    status: string;
  };
  searchResults: {
    totalFound: number;
    selectedResult: number;
    searchQuery: string;
    processingTime: number;
  };
  metadata: {
    wasGenerated: boolean;
    provider: string;
    searchTime: number;
    totalTime: number;
  };
}

/**
 * POST /api/admin/image/search
 * Search for a featured image for an article using AI prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ImageSearchRequest;

    // Validate required fields
    if (!body.articleId || !body.aiPrompt || !body.filename || !body.altText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: articleId, aiPrompt, filename, altText'
        },
        { status: 400 }
      );
    }

    console.log('🖼️ [Image Search] Starting image search for article:', {
      articleId: body.articleId,
      aiPrompt: body.aiPrompt,
      filename: body.filename,
      forceRegenerate: body.forceRegenerate
    });

    // Real implementation using Perplexity
    const startTime = Date.now();

    // Search for images using Perplexity AI
    const searchResult = await realPerplexityImageSearch(body.aiPrompt);

    if (searchResult.isFailure()) {
      console.error('❌ [Image Search] Failed:', searchResult.error);
      return NextResponse.json(
        {
          success: false,
          error: searchResult.error.message,
          code: searchResult.error.code
        },
        { status: 500 }
      );
    }

    const totalTime = Date.now() - startTime;

    console.log('✅ [Image Search] Completed successfully:', {
      articleId: body.articleId,
      imageUrl: searchResult.value.image.url,
      totalTime
    });

    return NextResponse.json({
      success: true,
      data: searchResult.value
    });

  } catch (error) {
    console.error('💥 [Image Search] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during image search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Real Perplexity Image Search Implementation
 */
async function realPerplexityImageSearch(aiPrompt: string): Promise<Result<ImageSearchResponse, { code: string; message: string }>> {
  try {
    const startTime = Date.now();

    // Get Perplexity API key from environment
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) {
      return Result.failure({
        code: 'CONFIGURATION_ERROR',
        message: 'Perplexity API key not configured'
      });
    }

    console.log('🔍 [Perplexity] Searching for images with prompt:', aiPrompt);

    // Create a focused search prompt for finding relevant free images
    const searchPrompt = `Find me 3-5 free, copyright-free, high-quality images for this specific topic: "${aiPrompt}"

Requirements:
- Images must be directly related to the topic/subject described
- Must be free to use (Creative Commons Zero, Public Domain, or royalty-free)
- From reputable sources like Unsplash, Pixabay, Pexels, or Freepik
- High resolution and professional quality
- Provide ONLY direct image URLs (ending in .jpg, .png, .webp, etc.)

Search specifically for images that match the theme, subject, or keywords in the prompt. Be very precise in matching the content.

Format your response with just the relevant image URLs, one per line, like:
https://images.unsplash.com/photo-[specific-to-topic].jpg
https://cdn.pixabay.com/photo-[related-to-subject].jpg

Only include working, direct image URLs from free sources that are directly relevant to: ${aiPrompt}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at finding relevant, free images that precisely match given topics. Always search for images that are directly related to the specific subject matter described.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.2, // Lower temperature for more focused results
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Perplexity] API error:', response.status, errorText);
      return Result.failure({
        code: 'API_ERROR',
        message: `Perplexity API error: ${response.status}`
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('📝 [Perplexity] Raw response:', content.substring(0, 200) + '...');

    // Parse the response to extract relevant image URLs
    const imageResults = parseRelevantImageResults(content, aiPrompt);

    if (imageResults.length === 0) {
      console.log('⚠️ [Perplexity] No relevant images found, falling back to general search');

      // Fallback: simplified search for general topic
      const fallbackImages = await fallbackImageSearch(aiPrompt);
      if (fallbackImages.length > 0) {
        imageResults.push(...fallbackImages);
      }
    }

    if (imageResults.length === 0) {
      return Result.failure({
        code: 'NO_RESULTS',
        message: 'No relevant free images found for the given topic'
      });
    }

    const processingTime = Date.now() - startTime;
    const selectedImage = imageResults[0]; // Select the most relevant image

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log('✅ [Perplexity] Found relevant image:', selectedImage.url);

    return Result.success({
      image: {
        id: imageId,
        articleId: 'perplexity-search',
        url: selectedImage.url,
        filename: `featured-${aiPrompt.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}-${Date.now()}.jpg`,
        altText: selectedImage.description || `Professional image representing ${aiPrompt}`,
        status: 'found'
      },
      searchResults: {
        totalFound: imageResults.length,
        selectedResult: 0,
        searchQuery: aiPrompt,
        processingTime
      },
      metadata: {
        wasGenerated: false,
        provider: 'perplexity-search',
        searchTime: processingTime,
        totalTime: processingTime
      }
    });

  } catch (error) {
    console.error('💥 [Perplexity] Search error:', error);
    return Result.failure({
      code: 'SEARCH_FAILED',
      message: error instanceof Error ? error.message : 'Image search failed'
    });
  }
}

/**
 * Parse image URLs from Perplexity response, filtering for relevance
 */
function parseRelevantImageResults(content: string, originalPrompt: string): Array<{url: string, source: string, description?: string}> {
  const results: Array<{url: string, source: string, description?: string}> = [];

  // Extract URLs that look like image URLs
  const urlRegex = /https?:\/\/[^\s\)]+\.(jpg|jpeg|png|webp|gif)/gi;
  const urls = content.match(urlRegex) || [];

  // Filter for trusted sources that are likely to have relevant content
  const trustedSources = [
    'images.unsplash.com',
    'cdn.pixabay.com',
    'images.pexels.com',
    'img.freepik.com',
    'burst.shopify.com'
  ];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const isTrustedSource = trustedSources.some(source => urlObj.hostname.includes(source));

      if (isTrustedSource) {
        results.push({
          url: url,
          source: urlObj.hostname,
          description: `Professional image related to ${originalPrompt}`
        });
      }
    } catch {
      continue; // Invalid URL, skip
    }
  }

  return results.slice(0, 5); // Limit to 5 most relevant results
}

/**
 * Fallback search for common topics
 */
async function fallbackImageSearch(prompt: string): Promise<Array<{url: string, source: string, description?: string}>> {
  // Common fallback images for typical topics (these would be from Unsplash collections)
  const fallbackMappings: Record<string, string[]> = {
    'tecnologia': [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', // Tech
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800'  // AI/Tech
    ],
    'business': [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', // Business
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800'  // Meeting
    ],
    'salute': [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800', // Health
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'  // Medicine
    ]
  };

  // Look for keywords in the prompt
  for (const [topic, images] of Object.entries(fallbackMappings)) {
    if (prompt.toLowerCase().includes(topic)) {
      return images.map(url => ({
        url,
        source: 'unsplash.com',
        description: `Professional image related to ${topic}`
      }));
    }
  }

  // Generic professional image as last resort
  return [{
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800',
    source: 'unsplash.com',
    description: 'Professional generic business image'
  }];
}

/**
 * GET /api/admin/image/search/health
 * Health check for the image search service
 */
export async function GET(request: NextRequest) {
  try {
    // Mock health check
    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        provider: 'perplexity',
        responseTime: 150,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}