import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/cron/auto-generation
 * Simplified cron endpoint che genera automaticamente articoli AI dai FeedItems.
 * Separated from RSS polling for clean module architecture.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🤖 [AutoGeneration CRON] Starting automatic article generation process...');
    const startTime = Date.now();

    // Check if auto-generation is enabled in WordPress settings
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite) {
      console.log('⚠️ [AutoGeneration CRON] No active WordPress site found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No active WordPress site configured',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    if (!wordpressSite.enableAutoGeneration) {
      console.log('⚠️ [AutoGeneration CRON] Auto-generation is disabled in WordPress settings');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Auto-generation is disabled',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    console.log(`✅ [AutoGeneration CRON] Auto-generation enabled for: ${wordpressSite.name}`);

    // Find all FeedItems that need to be processed (no corresponding Article)
    const feedItemsToProcess = await prisma.feedItem.findMany({
      where: {
        articles: {
          none: {}
        }
      },
      include: {
        source: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 3 // Limit to 3 items per run
    });

    console.log(`📊 [AutoGeneration CRON] Found ${feedItemsToProcess.length} feed items needing AI generation`);

    if (feedItemsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No feed items needing article generation',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each feed item
    for (const feedItem of feedItemsToProcess) {
      try {
        console.log(`🤖 [AutoGeneration] Processing: ${feedItem.id} - "${feedItem.title}"`);
        results.processed++;

        const articleResult = await generateArticleFromFeedItem(
          feedItem,
          wordpressSite.enableFeaturedImage,
          wordpressSite.enableAutoPublish
        );

        if (articleResult.success) {
          results.successful++;
          console.log(`✅ [AutoGeneration] Article created: ${articleResult.articleId}`);
        } else {
          results.failed++;
          results.errors.push(`${feedItem.id}: ${articleResult.error}`);
          console.error(`❌ [AutoGeneration] Failed: ${articleResult.error}`);
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${feedItem.id}: ${errorMsg}`);
        console.error(`💥 [AutoGeneration] Error:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    console.log(`🏁 [AutoGeneration CRON] Completed:`, {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: { ...results, duration },
      message: `Processed ${results.processed} feed items, generated ${results.successful} articles`
    });

  } catch (error) {
    console.error('💥 Critical error in auto-generation CRON:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during auto-generation',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

/**
 * Simplified article generation from feed item
 */
async function generateArticleFromFeedItem(
  feedItem: any,
  enableFeaturedImage: boolean,
  enableAutoPublish: boolean
): Promise<{ success: boolean; articleId?: string; error?: string }> {
  try {
    // Determine article status based on automation flags
    let status = 'generated';
    if (enableFeaturedImage) {
      status = 'generated_image_draft';
      console.log(`🎨 [AutoGeneration] Will create with generated_image_draft status`);
    } else if (enableAutoPublish) {
      status = 'ready_to_publish';
      console.log(`📤 [AutoGeneration] Will create with ready_to_publish status`);
    } else {
      console.log(`✋ [AutoGeneration] Will create with generated status (manual workflow)`);
    }

    // Create basic article (simplified without AI for now - will add AI later)
    const articleId = `art_${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`;

    const article = await prisma.article.create({
      data: {
        id: articleId,
        title: `[AI Generated] ${feedItem.title}`,
        content: `<p>Articolo generato automaticamente da: ${feedItem.title}</p><p>${feedItem.content || feedItem.description || ''}</p>`,
        status: status,
        sourceId: feedItem.sourceId,
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

    console.log(`✅ [AutoGeneration] Article saved: ${article.id} with status: ${article.status}`);

    return {
      success: true,
      articleId: article.id
    };

  } catch (error) {
    console.error(`💥 [AutoGeneration] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}