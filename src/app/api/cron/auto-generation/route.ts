import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createContentContainer } from '@/modules/content/infrastructure/container/ContentContainer';

/**
 * GET /api/cron/auto-generation
 * Cron endpoint che genera automaticamente articoli AI dai FeedItems
 * con status 'draft'. Ogni modulo ha Single Responsibility.
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

    // Find all FeedItems that need to be processed (status = draft, no corresponding Article)
    const feedItemsToProcess = await prisma.feedItem.findMany({
      where: {
        // Only process items that don't have corresponding articles
        articles: {
          none: {}
        }
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            configuration: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first
      },
      take: 5 // Limit to 5 items per run to avoid overload
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

    // Log items to process
    feedItemsToProcess.forEach(item => {
      console.log(`  - ${item.id}: "${item.title}" from ${item.source?.name || 'Unknown source'}`);
    });

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Initialize Content Container for clean architecture
    const contentContainer = createContentContainer();

    // Process each feed item for article generation
    for (const feedItem of feedItemsToProcess) {
      try {
        console.log(`🤖 [AutoGeneration] Processing feed item: ${feedItem.id} - "${feedItem.title}"`);
        results.processed++;

        // Prepare generation settings from source configuration
        const sourceConfig = feedItem.source?.configuration as any || {};
        const generationSettings = {
          titlePrompt: sourceConfig.titlePrompt || 'Crea un titolo accattivante e SEO-friendly',
          contentPrompt: sourceConfig.contentPrompt || 'Scrivi un articolo completo e ben strutturato',
          seoPrompt: sourceConfig.seoPrompt || 'Includi meta description e SEO tags',
          model: sourceConfig.model || 'sonar-pro',
          temperature: sourceConfig.temperature || 0.7,
          maxTokens: sourceConfig.maxTokens || 2000,
          language: sourceConfig.language || 'it',
          tone: sourceConfig.tone || 'professionale',
          style: sourceConfig.style || 'giornalistico',
          targetAudience: sourceConfig.targetAudience || 'generale'
        };

        // Transform FeedItem to FeedItemData format
        const feedItemData = {
          id: feedItem.id,
          title: feedItem.title,
          content: feedItem.content || feedItem.description || '',
          url: feedItem.url,
          publishedAt: feedItem.publishedAt
        };

        // Use AutoGenerateArticles use case
        const generateResult = await contentContainer.contentAdminFacade.generateArticlesFromFeeds({
          sourceId: feedItem.sourceId,
          feedItems: [feedItemData],
          generationSettings,
          enableFeaturedImage: wordpressSite.enableFeaturedImage,
          enableAutoPublish: wordpressSite.enableAutoPublish
        });

        if (generateResult.isSuccess()) {
          const generationResults = generateResult.value.results;
          const successfulGenerations = generationResults.filter(r => r.success).length;

          if (successfulGenerations > 0) {
            results.successful++;
            console.log(`✅ [AutoGeneration] Article generated successfully: ${feedItem.id}`);

            // Determine expected next status
            if (wordpressSite.enableFeaturedImage) {
              console.log(`   🎨 Next: generated_image_draft → auto-image cron will process`);
            } else if (wordpressSite.enableAutoPublish) {
              console.log(`   📤 Next: ready_to_publish → auto-publishing cron will process`);
            } else {
              console.log(`   ✋ Final: generated (manual workflow, no automation)`);
            }
          } else {
            results.failed++;
            const errorMsg = generationResults[0]?.error || 'Unknown generation error';
            results.errors.push(`${feedItem.id}: ${errorMsg}`);
            console.error(`❌ [AutoGeneration] Failed to generate article: ${errorMsg}`);
          }
        } else {
          results.failed++;
          results.errors.push(`${feedItem.id}: ${generateResult.error.message}`);
          console.error(`❌ [AutoGeneration] Auto-generation failed: ${generateResult.error.message}`);
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${feedItem.id}: ${errorMsg}`);
        console.error(`💥 [AutoGeneration] Error processing feed item ${feedItem.id}:`, error);
      }

      // Small delay between generations to avoid overwhelming services
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    console.log(`🏁 [AutoGeneration CRON] Auto-generation process completed:`, {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      duration: `${duration}ms`
    });

    if (results.errors.length > 0) {
      console.warn('❌ Auto-generation errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        ...results,
        duration
      },
      message: `Processed ${results.processed} feed items, generated ${results.successful} articles, failed ${results.failed}`
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

/**
 * POST /api/cron/auto-generation
 * Manual trigger for auto-generation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual auto-generation triggered');
    return GET(request);
  } catch (error) {
    console.error('Error in manual auto-generation trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual auto-generation' },
      { status: 500 }
    );
  }
}