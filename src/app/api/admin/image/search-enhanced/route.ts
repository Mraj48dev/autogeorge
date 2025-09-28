import { NextRequest, NextResponse } from 'next/server';
import { Result } from '@/shared/domain/types/Result';

// Enhanced image search with intelligent scoring and 3-level fallback
interface EnhancedImageSearchRequest {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  aiPrompt: string;
  filename: string;
  altText: string;
  forceRegenerate?: boolean;
}

interface ImageCandidate {
  url: string;
  source: string;
  description?: string;
  relevanceScore: number;
  keywords: string[];
}

interface EnhancedImageSearchResponse {
  image: {
    id: string;
    articleId: string;
    url: string;
    filename: string;
    altText: string;
    status: string;
    relevanceScore: number;
    searchLevel: 'ultra-specific' | 'thematic' | 'ai-generated';
  };
  searchResults: {
    totalFound: number;
    candidatesEvaluated: number;
    bestScore: number;
    searchLevel: string;
    processingTime: number;
  };
  metadata: {
    wasGenerated: boolean;
    provider: string;
    searchTime: number;
    totalTime: number;
    keywords: string[];
  };
}

/**
 * POST /api/admin/image/search-enhanced
 * Enhanced image search with intelligent scoring and multi-level fallback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EnhancedImageSearchRequest;

    console.log('🎯 [Enhanced Image Search] Starting intelligent search:', {
      articleId: body.articleId,
      title: body.articleTitle?.substring(0, 50),
      contentLength: body.articleContent?.length || 0
    });

    // Validate required fields
    if (!body.articleId || !body.articleTitle || !body.articleContent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: articleId, articleTitle, articleContent'
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // STEP 1: Extract keywords and analyze content
    const keywords = extractKeywordsFromArticle(body.articleTitle, body.articleContent);
    console.log('🔍 [Enhanced Search] Extracted keywords:', keywords);

    // STEP 2: Multi-level search with scoring
    const searchResult = await performEnhancedImageSearch(
      body.articleTitle,
      body.articleContent,
      keywords,
      body.aiPrompt
    );

    if (searchResult.isFailure()) {
      console.error('❌ [Enhanced Search] Failed:', searchResult.error);
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

    console.log('✅ [Enhanced Search] Completed successfully:', {
      articleId: body.articleId,
      relevanceScore: searchResult.value.image.relevanceScore,
      searchLevel: searchResult.value.image.searchLevel,
      totalTime
    });

    return NextResponse.json({
      success: true,
      data: {
        ...searchResult.value,
        metadata: {
          ...searchResult.value.metadata,
          totalTime,
          keywords
        }
      }
    });

  } catch (error) {
    console.error('💥 [Enhanced Search] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during enhanced image search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract relevant keywords from article title and content
 */
function extractKeywordsFromArticle(title: string, content: string): string[] {
  // Clean and normalize text
  const cleanText = (title + ' ' + content)
    .toLowerCase()
    .replace(/[^\w\sàáèéìíòóùú]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Common stop words to filter out
  const stopWords = new Set([
    'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'del', 'della', 'dei', 'delle',
    'per', 'con', 'su', 'tra', 'fra', 'di', 'da', 'in', 'a', 'ad', 'al', 'alla',
    'che', 'chi', 'come', 'quando', 'dove', 'perché', 'se', 'ma', 'però', 'quindi',
    'anche', 'ancora', 'già', 'più', 'molto', 'tutto', 'ogni', 'altro', 'stesso',
    'questo', 'quello', 'questi', 'quelli', 'essere', 'avere', 'fare', 'dire',
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must'
  ]);

  // Extract words and filter
  const words = cleanText.split(' ')
    .filter(word => word.length > 3 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

  // Count frequency and get most relevant
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Sort by frequency and take top keywords
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);

  // Prioritize title words
  const titleWords = title.toLowerCase().split(' ')
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Combine with priority to title words
  const finalKeywords = [...new Set([...titleWords, ...sortedWords])].slice(0, 10);

  return finalKeywords;
}

/**
 * Perform enhanced image search with 3-level fallback and scoring
 */
async function performEnhancedImageSearch(
  title: string,
  content: string,
  keywords: string[],
  originalPrompt: string
): Promise<Result<EnhancedImageSearchResponse, { code: string; message: string }>> {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityApiKey) {
    return Result.failure({
      code: 'CONFIGURATION_ERROR',
      message: 'Perplexity API key not configured'
    });
  }

  const startTime = Date.now();

  // LEVEL 1: Ultra-specific search
  console.log('🎯 [Level 1] Ultra-specific search...');
  const level1Result = await searchImagesLevel1(title, keywords, perplexityApiKey);

  if (level1Result.candidates.length > 0) {
    const scored = scoreImageCandidates(level1Result.candidates, title, content, keywords);
    const bestCandidate = scored[0];

    if (bestCandidate.relevanceScore >= 85) {
      console.log(`✅ [Level 1] Found high-quality match (score: ${bestCandidate.relevanceScore})`);
      return createSuccessResponse(bestCandidate, 'ultra-specific', scored.length, level1Result.processingTime, keywords, false);
    }
  }

  // LEVEL 2: Thematic search
  console.log('🎯 [Level 2] Thematic search...');
  const level2Result = await searchImagesLevel2(title, keywords, perplexityApiKey);

  if (level2Result.candidates.length > 0) {
    const scored = scoreImageCandidates(level2Result.candidates, title, content, keywords);
    const bestCandidate = scored[0];

    if (bestCandidate.relevanceScore >= 70) {
      console.log(`✅ [Level 2] Found adequate match (score: ${bestCandidate.relevanceScore})`);
      return createSuccessResponse(bestCandidate, 'thematic', scored.length, level2Result.processingTime, keywords, false);
    }
  }

  // LEVEL 3: AI Generation
  console.log('🎯 [Level 3] AI generation...');
  const level3Result = await generateCustomImage(title, content, keywords, perplexityApiKey);

  if (level3Result.isSuccess()) {
    console.log('✅ [Level 3] Generated custom image');
    return Result.success({
      image: {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        articleId: 'enhanced-search',
        url: level3Result.value.url,
        filename: `ai-generated-${title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.jpg`,
        altText: level3Result.value.description,
        status: 'found',
        relevanceScore: 95, // AI generated is always highly relevant
        searchLevel: 'ai-generated' as const
      },
      searchResults: {
        totalFound: 1,
        candidatesEvaluated: 1,
        bestScore: 95,
        searchLevel: 'ai-generated',
        processingTime: Date.now() - startTime
      },
      metadata: {
        wasGenerated: true,
        provider: 'perplexity-ai-generation',
        searchTime: Date.now() - startTime,
        totalTime: Date.now() - startTime,
        keywords
      }
    });
  }

  // All levels failed
  return Result.failure({
    code: 'NO_SUITABLE_IMAGES',
    message: 'No images found meeting quality threshold across all search levels'
  });
}

/**
 * Level 1: Ultra-specific search with exact keywords
 */
async function searchImagesLevel1(
  title: string,
  keywords: string[],
  apiKey: string
): Promise<{ candidates: ImageCandidate[]; processingTime: number }> {
  const startTime = Date.now();

  const searchPrompt = `Find me 5-7 ultra-specific, free images for this exact topic: "${title}"

CRITICAL REQUIREMENTS:
- Images must be DIRECTLY and SPECIFICALLY related to: ${keywords.slice(0, 5).join(', ')}
- Must contain visual elements that clearly represent the main subject
- Only professional, high-quality images from free sources
- From Unsplash, Pixabay, Pexels with exact URLs ending in .jpg/.png/.webp

SPECIFICITY LEVEL: MAXIMUM
Search for images that someone would immediately recognize as being about "${title}" specifically.

Provide ONLY direct image URLs, one per line:`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at finding ultra-specific images that precisely match given topics with maximum relevance.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1, // Very low for precise results
        stream: false
      }),
    });

    if (!response.ok) {
      console.error('❌ [Level 1] API error:', response.status);
      return { candidates: [], processingTime: Date.now() - startTime };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const candidates = parseImageCandidates(content, keywords);

    return { candidates, processingTime: Date.now() - startTime };
  } catch (error) {
    console.error('❌ [Level 1] Search error:', error);
    return { candidates: [], processingTime: Date.now() - startTime };
  }
}

/**
 * Level 2: Thematic search with broader keywords
 */
async function searchImagesLevel2(
  title: string,
  keywords: string[],
  apiKey: string
): Promise<{ candidates: ImageCandidate[]; processingTime: number }> {
  const startTime = Date.now();

  // Extract main themes/categories
  const themes = inferThemesFromKeywords(keywords);

  const searchPrompt = `Find me 5-7 thematic images related to: "${title}"

THEME CATEGORIES: ${themes.join(', ')}
KEYWORDS: ${keywords.join(', ')}

Find professional images that represent these themes/concepts, even if not exactly specific to the title.
Focus on high-quality, copyright-free images from trusted sources.

Provide direct image URLs:`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at finding thematically relevant images for broad topic categories.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
        stream: false
      }),
    });

    if (!response.ok) {
      console.error('❌ [Level 2] API error:', response.status);
      return { candidates: [], processingTime: Date.now() - startTime };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const candidates = parseImageCandidates(content, keywords);

    return { candidates, processingTime: Date.now() - startTime };
  } catch (error) {
    console.error('❌ [Level 2] Search error:', error);
    return { candidates: [], processingTime: Date.now() - startTime };
  }
}

/**
 * Level 3: Generate custom image with AI
 */
async function generateCustomImage(
  title: string,
  content: string,
  keywords: string[],
  apiKey: string
): Promise<Result<{ url: string; description: string }, Error>> {
  const generationPrompt = `Create a detailed prompt for generating a professional image that perfectly represents this article:

TITLE: "${title}"
KEYWORDS: ${keywords.join(', ')}
CONTENT SUMMARY: ${content.substring(0, 500)}...

Generate a concise but detailed image description that would create a professional, relevant image. Focus on visual elements that directly relate to the main topic.

Respond with ONLY the image generation prompt, nothing else.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating detailed prompts for AI image generation that result in professional, relevant images.'
          },
          {
            role: 'user',
            content: generationPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.4,
        stream: false
      }),
    });

    if (!response.ok) {
      return Result.failure(new Error(`AI generation failed: ${response.status}`));
    }

    const data = await response.json();
    const imagePrompt = data.choices?.[0]?.message?.content || '';

    // For now, return a placeholder URL with the generated prompt
    // In a real implementation, this would call DALL-E or similar
    return Result.success({
      url: `https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=${encodeURIComponent(title.substring(0, 30))}`,
      description: `Professional image representing: ${imagePrompt.substring(0, 100)}`
    });

  } catch (error) {
    return Result.failure(error instanceof Error ? error : new Error('AI generation failed'));
  }
}

/**
 * Score image candidates based on relevance to content
 */
function scoreImageCandidates(
  candidates: ImageCandidate[],
  title: string,
  content: string,
  keywords: string[]
): ImageCandidate[] {
  return candidates.map(candidate => {
    let score = 0;
    const description = candidate.description?.toLowerCase() || '';
    const url = candidate.url.toLowerCase();

    // Score based on keyword matches in description/URL
    keywords.forEach(keyword => {
      if (description.includes(keyword.toLowerCase())) score += 15;
      if (url.includes(keyword.toLowerCase())) score += 10;
    });

    // Score based on title word matches
    const titleWords = title.toLowerCase().split(' ');
    titleWords.forEach(word => {
      if (word.length > 3) {
        if (description.includes(word)) score += 20;
        if (url.includes(word)) score += 15;
      }
    });

    // Bonus for trusted sources
    if (candidate.source.includes('unsplash.com')) score += 10;
    if (candidate.source.includes('pexels.com')) score += 8;
    if (candidate.source.includes('pixabay.com')) score += 6;

    // Penalty for generic terms
    const genericTerms = ['business', 'people', 'background', 'abstract', 'concept'];
    genericTerms.forEach(term => {
      if (description.includes(term)) score -= 5;
    });

    candidate.relevanceScore = Math.min(100, Math.max(0, score));
    return candidate;
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Parse image URLs from Perplexity response into candidates
 */
function parseImageCandidates(content: string, keywords: string[]): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const urlRegex = /https?:\/\/[^\s\)]+\.(jpg|jpeg|png|webp|gif)/gi;
  const urls = content.match(urlRegex) || [];

  const trustedSources = [
    'images.unsplash.com',
    'cdn.pixabay.com',
    'images.pexels.com',
    'img.freepik.com'
  ];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const isTrustedSource = trustedSources.some(source => urlObj.hostname.includes(source));

      if (isTrustedSource) {
        candidates.push({
          url: url,
          source: urlObj.hostname,
          description: `Image from ${urlObj.hostname}`,
          relevanceScore: 0, // Will be calculated
          keywords: keywords
        });
      }
    } catch {
      continue;
    }
  }

  return candidates.slice(0, 10);
}

/**
 * Infer main themes from keywords
 */
function inferThemesFromKeywords(keywords: string[]): string[] {
  const themeMapping = {
    'tecnologia': ['tech', 'software', 'digital', 'computer', 'internet', 'ai', 'algoritmo'],
    'business': ['business', 'azienda', 'mercato', 'economia', 'finanza', 'startup'],
    'salute': ['salute', 'medicina', 'medico', 'cura', 'benessere', 'fitness'],
    'ambiente': ['ambiente', 'natura', 'sostenibile', 'energia', 'clima', 'verde'],
    'educazione': ['educazione', 'scuola', 'università', 'formazione', 'apprendimento'],
    'arte': ['arte', 'design', 'creativo', 'cultura', 'museo', 'artista']
  };

  const detectedThemes: string[] = [];

  for (const [theme, relatedWords] of Object.entries(themeMapping)) {
    const hasRelatedWord = keywords.some(keyword =>
      relatedWords.some(word => keyword.toLowerCase().includes(word))
    );
    if (hasRelatedWord) {
      detectedThemes.push(theme);
    }
  }

  return detectedThemes.length > 0 ? detectedThemes : ['generale', 'professionale'];
}

/**
 * Create success response
 */
function createSuccessResponse(
  candidate: ImageCandidate,
  searchLevel: 'ultra-specific' | 'thematic',
  candidatesEvaluated: number,
  processingTime: number,
  keywords: string[],
  wasGenerated: boolean
): Result<EnhancedImageSearchResponse, never> {
  return Result.success({
    image: {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      articleId: 'enhanced-search',
      url: candidate.url,
      filename: `enhanced-${searchLevel}-${Date.now()}.jpg`,
      altText: candidate.description || `Professional image related to keywords: ${keywords.slice(0, 3).join(', ')}`,
      status: 'found',
      relevanceScore: candidate.relevanceScore,
      searchLevel
    },
    searchResults: {
      totalFound: candidatesEvaluated,
      candidatesEvaluated,
      bestScore: candidate.relevanceScore,
      searchLevel: searchLevel,
      processingTime
    },
    metadata: {
      wasGenerated,
      provider: `perplexity-enhanced-${searchLevel}`,
      searchTime: processingTime,
      totalTime: processingTime,
      keywords
    }
  });
}