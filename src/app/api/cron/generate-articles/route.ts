import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * GET /api/cron/generate-articles
 * Cron endpoint per generazione automatica articoli da feed items non processati
 * Chiamato ogni 5 minuti da cron-job.org (separato dal polling RSS)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🤖 [CRON] Starting automatic article generation...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const startTime = Date.now();

    // Trova tutti i feed items non processati
    const unprocessedItems = await prisma.feedItem.findMany({
      where: {
        processed: false
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 50 // Limite per evitare timeout (processa max 50 alla volta)
    });

    console.log(`📊 Found ${unprocessedItems.length} unprocessed feed items`);

    if (unprocessedItems.length === 0) {
      console.log('✅ No articles to generate - all feed items already processed');
      return NextResponse.json({
        success: true,
        message: 'No new articles to generate',
        timestamp: new Date().toISOString(),
        results: {
          totalItems: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          duration: Date.now() - startTime
        }
      });
    }

    // Raggruppa per source per efficienza
    const itemsBySource = unprocessedItems.reduce((acc, item) => {
      const sourceId = item.sourceId;
      if (!acc[sourceId]) {
        acc[sourceId] = {
          source: item.source,
          items: []
        };
      }
      acc[sourceId].items.push(item);
      return acc;
    }, {} as Record<string, { source: any; items: any[] }>);

    console.log(`🔄 Processing items from ${Object.keys(itemsBySource).length} sources`);

    const results = {
      totalItems: unprocessedItems.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      duration: 0
    };

    // Usa il Sources Container per accesso all'ArticleAutoGenerator
    const sourcesContainer = createSourcesContainer();
    const articleAutoGenerator = sourcesContainer.articleAutoGenerator;

    // Processa ogni source
    for (const [sourceId, { source, items }] of Object.entries(itemsBySource)) {
      try {
        if (source.status !== 'active') {
          console.log(`⚠️ Skipping inactive source: ${source.name}`);
          results.skipped += items.length;
          continue;
        }

        console.log(`🔄 Generating articles for source: ${source.name} (${items.length} items)`);

        // Converte in formato FeedItemForGeneration
        const feedItemsForGeneration = items.map(item => ({
          id: item.id,
          guid: item.guid,
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: new Date(item.publishedAt)
        }));

        // 🔧 FIX: Get WordPress automation settings before generation
        const wordpressSite = await prisma.wordPressSite.findUnique({
          where: { userId: 'demo-user' }, // TODO: Get from auth context
          select: {
            id: true,
            name: true,
            enableAutoGeneration: true,
            enableFeaturedImage: true,
            enableAutoPublish: true,
            isActive: true
          }
        });

        const automationSettings = {
          enableFeaturedImage: wordpressSite?.enableFeaturedImage || false,
          enableAutoPublish: wordpressSite?.enableAutoPublish || false
        };

        console.log('🎯 [DEBUG] WordPress automation settings for generation:', {
          found: !!wordpressSite,
          siteId: wordpressSite?.id,
          siteName: wordpressSite?.name,
          enableAutoGeneration: wordpressSite?.enableAutoGeneration,
          enableFeaturedImage: automationSettings.enableFeaturedImage,
          enableAutoPublish: automationSettings.enableAutoPublish,
          isActive: wordpressSite?.isActive
        });

        // Genera articoli per questa source WITH CORRECT AUTOMATION SETTINGS
        const generationResult = await articleAutoGenerator.generateFromFeedItems({
          sourceId: sourceId,
          feedItems: feedItemsForGeneration,
          enableFeaturedImage: automationSettings.enableFeaturedImage,
          enableAutoPublish: automationSettings.enableAutoPublish
        });

        if (generationResult.isSuccess()) {
          const result = generationResult.value;

          console.log(`✅ Generation completed for ${source.name}: ${result.summary.successful}/${result.summary.total} successful`);

          results.processed += items.length;
          results.successful += result.summary.successful;
          results.failed += result.summary.failed;

          // Marca SOLO gli items che sono stati generati con successo
          if (result.summary.successful > 0) {
            // Dovremmo marcare solo quelli successful, ma per ora marca tutti
            // TODO: migliorare logica per marcare solo gli items successful
            const itemIds = items.map(item => item.id);
            await prisma.feedItem.updateMany({
              where: {
                id: { in: itemIds }
              },
              data: {
                processed: true
              }
            });

            console.log(`📝 Marked ${itemIds.length} feed items as processed`);
          } else {
            console.log(`⚠️ No successful generations for ${source.name}, keeping items as unprocessed for retry`);
          }
        } else {
          console.error(`❌ Generation failed for ${source.name}:`, generationResult.error.message);
          console.log(`⚠️ Keeping ${items.length} feed items as unprocessed for retry`);
          results.failed += items.length;
          results.errors.push(`${source.name}: ${generationResult.error.message}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`💥 Error processing source ${source.name}:`, error);
        results.failed += items.length;
        results.errors.push(`${source.name}: ${errorMessage}`);
      }
    }

    results.duration = Date.now() - startTime;

    console.log(`\n📊 Article generation completed:`);
    console.log(`   📄 Total items: ${results.totalItems}`);
    console.log(`   ✅ Successful: ${results.successful}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️ Skipped: ${results.skipped}`);
    console.log(`   ⏱️ Duration: ${results.duration}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('💥 Critical error in article generation cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Article generation cron failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/generate-articles
 * Test endpoint per triggare manualmente la generazione articoli
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Manual trigger for article generation...');

    // Richiama il GET endpoint internamente
    const testRequest = new NextRequest('http://localhost/api/cron/generate-articles');
    const result = await GET(testRequest);

    return result;
  } catch (error) {
    console.error('❌ Manual generation test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Manual generation test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}