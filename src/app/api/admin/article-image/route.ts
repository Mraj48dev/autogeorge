import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface ImageSearchResult {
  image: {
    id: string;
    articleId: string;
    url: string;
    filename: string;
    altText: string;
    status: string;
    relevanceScore?: number;
    searchLevel?: string;
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
    keywords?: string[];
  };
}

/**
 * GET /api/admin/article-image?articleId=<id>
 * Get the saved featured image for an article
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId parameter is required' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        articleData: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Extract featured image from articleData JSON
    const articleData = article.articleData as any;
    const featuredImage = articleData?.featuredImage || null;

    if (!featuredImage) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    console.log('📖 [Article Image] Retrieved saved featured image for article:', articleId);

    return NextResponse.json({
      success: true,
      data: featuredImage
    });

  } catch (error) {
    console.error('Error getting article image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/article-image
 * Save the featured image search result for an article
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { articleId, imageSearchResult } = requestBody;

    if (!articleId || !imageSearchResult) {
      return NextResponse.json(
        { error: 'articleId and imageSearchResult are required' },
        { status: 400 }
      );
    }

    console.log('💾 [Article Image] Saving featured image for article:', articleId);
    console.log('🖼️ [Article Image] Image data:', {
      url: imageSearchResult.image.url.substring(0, 60) + '...',
      searchLevel: imageSearchResult.image.searchLevel,
      relevanceScore: imageSearchResult.image.relevanceScore
    });

    // Get current article data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        articleData: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Update articleData with featured image
    const currentData = (article.articleData as any) || {};
    const updatedData = {
      ...currentData,
      featuredImage: {
        ...imageSearchResult,
        savedAt: new Date().toISOString()
      }
    };

    // Save to database
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        articleData: updatedData,
        updatedAt: new Date()
      }
    });

    console.log('✅ [Article Image] Featured image saved successfully for article:', articleId);

    return NextResponse.json({
      success: true,
      data: {
        articleId: updatedArticle.id,
        featuredImage: imageSearchResult,
        savedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error saving article image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/article-image?articleId=<id>
 * Remove the saved featured image for an article
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ [Article Image] Removing featured image for article:', articleId);

    // Get current article data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        articleData: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Remove featuredImage from articleData
    const currentData = (article.articleData as any) || {};
    const { featuredImage, ...updatedData } = currentData;

    // Save to database
    await prisma.article.update({
      where: { id: articleId },
      data: {
        articleData: updatedData,
        updatedAt: new Date()
      }
    });

    console.log('✅ [Article Image] Featured image removed successfully for article:', articleId);

    return NextResponse.json({
      success: true,
      data: {
        articleId,
        removed: true
      }
    });

  } catch (error) {
    console.error('Error removing article image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}