import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 [AutoGeneration] Starting...');

    // Simple test - check if WordPress site exists and auto-generation is enabled
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite || !wordpressSite.enableAutoGeneration) {
      return NextResponse.json({
        success: true,
        message: 'Auto-generation disabled or no active site',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    console.log('✅ Auto-generation enabled');

    // Simple test - count feed items that need processing
    const feedItemCount = await prisma.feedItem.count({
      where: { articleId: null }
    });

    console.log(`📊 Found ${feedItemCount} feed items needing processing`);

    if (feedItemCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No feed items to process',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    // Process one feed item to test article creation
    const feedItems = await prisma.feedItem.findMany({
      where: { articleId: null },
      take: 1
    });

    if (feedItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No feed items to process',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    const feedItem = feedItems[0];
    let status = 'generated';
    if (wordpressSite.enableFeaturedImage) {
      status = 'generated_image_draft';
    } else if (wordpressSite.enableAutoPublish) {
      status = 'ready_to_publish';
    }

    try {
      const articleId = `art_${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`;

      const article = await prisma.article.create({
        data: {
          id: articleId,
          title: `[AI Generated] ${feedItem.title}`,
          content: `<p>Articolo generato automaticamente da: ${feedItem.title}</p><p>${feedItem.content || ''}</p>`,
          status: status,
          source: {
            connect: { id: feedItem.sourceId }
          },
          seoMetadata: {
            metaDescription: feedItem.title?.substring(0, 160) || '',
            seoTags: ['auto-generated', 'rss', 'content']
          },
          generationMetadata: {
            model: 'simplified',
            provider: 'auto-generation-cron',
            feedItemId: feedItem.id,
            generationTime: Date.now()
          }
        }
      });

      // Update feed item
      await prisma.feedItem.update({
        where: { id: feedItem.id },
        data: { articleId: article.id, processed: true }
      });

      return NextResponse.json({
        success: true,
        message: `Generated 1 article with status: ${status}`,
        results: {
          processed: 1,
          successful: 1,
          failed: 0,
          articleId: article.id,
          status: article.status
        }
      });

    } catch (createError) {
      console.error('Article creation failed:', createError);
      return NextResponse.json({
        success: false,
        error: 'Article creation failed',
        details: createError instanceof Error ? createError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Error in auto-generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}