import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * DEBUG endpoint to inspect featured images relationship
 */
export async function GET(request: NextRequest) {
  try {
    // Get recent articles with their featured images
    const articlesWithImages = await prisma.article.findMany({
      where: {
        status: { in: ['published', 'ready_to_publish', 'generated_with_image'] }
      },
      include: {
        featuredImages: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Also get orphaned featured images
    const allFeaturedImages = await prisma.featuredImage.findMany({
      where: {
        articleId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      success: true,
      debug: {
        articlesWithImages: articlesWithImages.map(article => ({
          id: article.id,
          title: article.title.substring(0, 50),
          status: article.status,
          createdAt: article.createdAt,
          featuredImagesCount: article.featuredImages?.length || 0,
          featuredImages: article.featuredImages?.map(img => ({
            id: img.id,
            status: img.status,
            url: img.url ? 'HAS_URL' : 'NO_URL',
            wordpressMediaId: img.wordpressMediaId,
            wordpressUrl: img.wordpressUrl ? 'HAS_WP_URL' : 'NO_WP_URL'
          })) || []
        })),
        allFeaturedImages: allFeaturedImages.map(img => ({
          id: img.id,
          articleId: img.articleId,
          status: img.status,
          url: img.url ? 'HAS_URL' : 'NO_URL',
          wordpressMediaId: img.wordpressMediaId,
          createdAt: img.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Debug featured images error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}