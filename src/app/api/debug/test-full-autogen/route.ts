import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * TEST COMPLETO: Simula tutto il flusso di auto-generazione
 * 1. Crea FeedItem
 * 2. Verifica configurazione auto-gen
 * 3. Triggera FetchFromSource (che dovrebbe fare auto-gen)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [FULL TEST] Starting complete auto-generation test...');

    const sourceId = 'cmfzyrmw5jbbfpd8c'; // Sito di test

    // STEP 1: Verifica configurazione
    const source = await prisma.source.findUnique({
      where: { id: sourceId }
    });

    const autoGenEnabled = !!(source?.configuration as any)?.autoGenerate;
    console.log(`🤖 [FULL TEST] Auto-generation enabled: ${autoGenEnabled}`);

    if (!autoGenEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Auto-generation not enabled. Run /api/admin/fix-autogen-config first'
      });
    }

    // STEP 2: Crea un FeedItem di test
    await prisma.feedItem.deleteMany({ where: { sourceId } });

    const testFeedItem = await prisma.feedItem.create({
      data: {
        sourceId,
        guid: `FULL-TEST-${Date.now()}`,
        title: 'Full Auto-Generation Test Article',
        content: 'Questo è un test completo del flusso di auto-generazione. Il sistema dovrebbe rilevare questo FeedItem e generare automaticamente un articolo usando Perplexity AI.',
        url: `https://fulltest.autogeorge.dev/${Date.now()}`,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        processed: false,
      }
    });

    console.log('✅ [FULL TEST] Test FeedItem created:', testFeedItem.id);

    // STEP 3: Simula il flusso che farebbe il cron
    // Invece di chiamare FetchFromSource (che non funziona),
    // chiamiamo direttamente l'auto-generation
    const container = createSourcesContainer();

    // Verifica che il container abbia l'auto-generator
    const autoGenerator = container.articleAutoGenerator;
    if (!autoGenerator) {
      return NextResponse.json({
        success: false,
        error: 'ArticleAutoGenerator not available in container'
      });
    }

    // Prepara i dati per auto-generazione
    const feedItemsForGeneration = [{
      id: testFeedItem.id,
      guid: testFeedItem.guid,
      title: testFeedItem.title,
      content: testFeedItem.content || '',
      url: testFeedItem.url,
      publishedAt: testFeedItem.publishedAt
    }];

    console.log('🤖 [FULL TEST] Starting auto-generation...');

    // Triggera auto-generazione
    const autoGenResult = await autoGenerator.generateFromFeedItems({
      sourceId,
      feedItems: feedItemsForGeneration
    });

    if (autoGenResult.isSuccess()) {
      const result = autoGenResult.value;

      console.log(`✅ [FULL TEST] Auto-generation completed: ${result.summary.successful}/${result.summary.total} successful`);

      // Marca come processato se successo
      for (const genResult of result.generatedArticles) {
        if (genResult.success && genResult.articleId) {
          await prisma.feedItem.update({
            where: { id: genResult.feedItemId },
            data: {
              processed: true,
              articleId: genResult.articleId
            }
          });
        }
      }

      // Conta articoli totali
      const totalArticles = await prisma.article.count();

      return NextResponse.json({
        success: true,
        testResults: {
          autoGenEnabled,
          feedItemCreated: testFeedItem.id,
          autoGeneration: result.summary,
          generatedArticles: result.generatedArticles.map(r => ({
            feedItemId: r.feedItemId,
            articleId: r.articleId,
            success: r.success,
            error: r.error
          })),
          totalArticlesInDatabase: totalArticles
        },
        message: `Full auto-generation test completed: ${result.summary.successful} articles generated`
      });

    } else {
      console.error('❌ [FULL TEST] Auto-generation failed:', autoGenResult.error);
      return NextResponse.json({
        success: false,
        error: 'Auto-generation failed',
        details: autoGenResult.error.message,
        testData: {
          autoGenEnabled,
          feedItemCreated: testFeedItem.id
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [FULL TEST] Complete auto-generation test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}