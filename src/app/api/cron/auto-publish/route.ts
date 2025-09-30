import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/cron/auto-publish
 * Cron endpoint che pubblica automaticamente gli articoli in status "generated"
 * quando l'auto-pubblicazione è abilitata nelle impostazioni WordPress
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🚀 [AutoPublish CRON] Starting auto-publish process...');
    const startTime = Date.now();

    // Check if auto-publishing is enabled in WordPress settings
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite) {
      console.log('⚠️ [AutoPublish CRON] No active WordPress site found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No active WordPress site configured',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    if (!wordpressSite.enableAutoPublish) {
      console.log('⚠️ [AutoPublish CRON] Auto-publishing is disabled in WordPress settings');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Auto-publishing is disabled',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    console.log(`✅ [AutoPublish CRON] Auto-publishing is enabled for: ${wordpressSite.name}`);

    // Find all articles with status "generated" that should be auto-published
    const generatedArticles = await prisma.article.findMany({
      where: {
        status: 'generated',
        // Only auto-publish articles that were created with auto-generation
        // (not manually generated ones)
        generationConfig: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'asc' // Publish oldest first
      },
      take: 10 // Limit to 10 articles per run to avoid overload
    });

    console.log(`📊 [AutoPublish CRON] Found ${generatedArticles.length} articles to auto-publish`);

    if (generatedArticles.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No generated articles found for auto-publishing',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    const results = {
      processed: 0,
      published: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each article for auto-publishing
    for (const article of generatedArticles) {
      try {
        console.log(`📤 [AutoPublish CRON] Processing article: ${article.id} - "${article.title}"`);
        results.processed++;

        // Use the existing auto-publish functionality from AutoGenerateArticles
        const { autoPublishArticle } = await import('@/modules/content/application/use-cases/AutoGenerateArticles');

        // For now, simulate the auto-publishing by using the WordPress publishing service directly
        const { WordPressPublishingService } = await import('@/modules/publishing/infrastructure/services/WordPressPublishingService');
        const { PublicationTarget } = await import('@/modules/publishing/domain/value-objects/PublicationTarget');

        const publishingService = new WordPressPublishingService();

        // Create publication target (FIXED: correct parameter order)
        console.log(`🔍 [DEBUG] WordPress site data:`, {
          id: wordpressSite.id,
          url: wordpressSite.url,
          username: wordpressSite.username ? '[SET]' : '[NOT SET]',
          password: wordpressSite.password ? '[SET]' : '[NOT SET]',
          defaultStatus: wordpressSite.defaultStatus
        });

        const config = {
          username: wordpressSite.username,
          password: wordpressSite.password,
          status: wordpressSite.defaultStatus || 'publish'
        };

        console.log(`🔍 [DEBUG] Config object:`, config);
        console.log(`🔍 [DEBUG] Calling PublicationTarget.wordpress with:`, {
          siteUrl: wordpressSite.url,
          siteId: wordpressSite.id,
          configType: typeof config,
          configKeys: Object.keys(config)
        });

        const publicationTarget = PublicationTarget.wordpress(
          wordpressSite.url,    // siteUrl first
          wordpressSite.id,     // siteId second
          config
        );

        const content = {
          title: article.title,
          content: article.content,
          excerpt: article.title.substring(0, 150),
          categories: wordpressSite.defaultCategory ? [wordpressSite.defaultCategory] : [],
          tags: [],
          featuredImage: null,
          customFields: {}
        };

        const metadata = {
          articleId: article.id,
          sourceId: article.sourceId || '',
          generatedAt: new Date(),
          autoPublished: true
        };

        // Attempt to publish
        const publishResult = await publishingService.publish(publicationTarget, content, metadata);

        if (publishResult.isSuccess()) {
          // Update article status to published
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'published',
              publishedAt: new Date()
            }
          });

          results.published++;
          console.log(`✅ [AutoPublish CRON] Article published successfully: ${article.id} → ${publishResult.value.externalUrl || 'WordPress'}`);
        } else {
          results.failed++;
          results.errors.push(`${article.id}: ${publishResult.error.message}`);
          console.error(`❌ [AutoPublish CRON] Failed to publish article ${article.id}:`, publishResult.error.message);
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${article.id}: ${errorMsg}`);
        console.error(`💥 [AutoPublish CRON] Error processing article ${article.id}:`, error);
      }

      // Small delay between publications to avoid overwhelming WordPress
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    console.log(`🏁 [AutoPublish CRON] Auto-publish process completed:`, {
      processed: results.processed,
      published: results.published,
      failed: results.failed,
      duration: `${duration}ms`
    });

    if (results.errors.length > 0) {
      console.warn('❌ Auto-publish errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        ...results,
        duration
      },
      message: `Processed ${results.processed} articles, published ${results.published}, failed ${results.failed}`
    });

  } catch (error) {
    console.error('💥 Critical error in auto-publish CRON:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during auto-publishing',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/auto-publish
 * Manual trigger for auto-publishing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual auto-publish triggered');
    return GET(request);
  } catch (error) {
    console.error('Error in manual auto-publish trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual auto-publishing' },
      { status: 500 }
    );
  }
}