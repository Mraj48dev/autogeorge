import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface SearchOnlyRequest {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  aiPrompt: string;
  filename: string;
  altText: string;
}

/**
 * POST /api/admin/image/search-only
 * Search for images without AI generation fallback
 * Used when only the "cerca immagine" flag is enabled
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody: SearchOnlyRequest = await request.json();
    const { articleId, articleTitle, articleContent, aiPrompt, filename, altText } = requestBody;

    console.log('🔍 [Search Only] Starting image search for article:', articleId);

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true }
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Call the enhanced search endpoint internally
    const searchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://autogeorge.vercel.app'}/api/admin/image/search-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articleId,
        articleTitle,
        articleContent,
        aiPrompt,
        filename,
        altText,
        searchOnly: true // Force search-only mode
      })
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('❌ [Search Only] Enhanced search failed:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Search failed' },
        { status: searchResponse.status }
      );
    }

    const searchResult = await searchResponse.json();

    if (!searchResult.success) {
      console.error('❌ [Search Only] Enhanced search returned error:', searchResult.error);
      return NextResponse.json(
        { success: false, error: searchResult.error },
        { status: 400 }
      );
    }

    // Check if we found a good quality image
    const imageData = searchResult.data;
    const relevanceScore = imageData.image?.relevanceScore || 0;

    if (relevanceScore < 50) {
      console.log('🔍 [Search Only] Low relevance score:', relevanceScore);
      return NextResponse.json({
        success: false,
        error: 'No high-quality images found',
        data: {
          searchAttempted: true,
          bestScore: relevanceScore,
          reason: 'Relevance score too low for search-only mode'
        }
      });
    }

    console.log('✅ [Search Only] Found suitable image with score:', relevanceScore);

    return NextResponse.json({
      success: true,
      data: {
        ...imageData,
        searchLevel: 'search-only',
        method: 'web-search'
      }
    });

  } catch (error) {
    console.error('❌ [Search Only] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}