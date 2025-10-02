import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Simple test endpoint to check featured images
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting image test...');

    // Test 1: Check if featuredImage table exists and has data
    const imageCount = await prisma.featuredImage.count();
    console.log(`📊 Total featured images in database: ${imageCount}`);

    // Test 2: Get sample images
    const sampleImages = await prisma.featuredImage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📸 Sample images:`, sampleImages.map(img => ({
      id: img.id,
      articleId: img.articleId,
      status: img.status,
      hasUrl: !!img.url
    })));

    // Test 3: Check recent articles that should have images
    const recentArticles = await prisma.article.findMany({
      where: {
        status: { in: ['published', 'ready_to_publish', 'generated_with_image'] }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📄 Recent articles:`, recentArticles.map(art => ({
      id: art.id,
      title: art.title.substring(0, 30),
      status: art.status
    })));

    return NextResponse.json({
      success: true,
      data: {
        totalImages: imageCount,
        sampleImages: sampleImages.map(img => ({
          id: img.id,
          articleId: img.articleId,
          status: img.status,
          url: img.url ? 'HAS_URL' : 'NO_URL',
          filename: img.filename,
          createdAt: img.createdAt
        })),
        recentArticles: recentArticles.map(art => ({
          id: art.id,
          title: art.title.substring(0, 50),
          status: art.status,
          createdAt: art.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Test images error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}