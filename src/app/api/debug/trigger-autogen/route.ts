import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';
import { prisma } from '@/shared/database/prisma';

/**
 * ENDPOINT PRAGMATICO: Triggera auto-generazione su FeedItems esistenti
 * Bypassa il Sources Module e usa direttamente il Content Module
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [PRAGMATIC] Triggering auto-generation on existing FeedItems...');

    const sourceId = 'cmfzyrmw5jbbfpd8c'; // Sito di test

    // Verifica che ci siano FeedItems non processati
    const unprocessedItems = await prisma.feedItem.findMany({
      where: {
        sourceId,
        processed: false
      }
    });

    console.log(`📊 [PRAGMATIC] Found ${unprocessedItems.length} unprocessed FeedItems`);

    if (unprocessedItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No unprocessed FeedItems found. Create one first with /api/debug/create-test-feeditem'
      });
    }

    // Usa il Sources Container per ottenere l'ArticleAutoGenerator
    const container = createSourcesContainer();
    const autoGenerator = container.articleAutoGenerator;

    // Prepara i FeedItems per l'auto-generazione
    const feedItemsForGeneration = unprocessedItems.map(item => ({
      id: item.id,
      guid: item.guid,
      title: item.title,
      content: item.content || '',
      url: item.url,
      publishedAt: item.publishedAt
    }));

    console.log(`🤖 [PRAGMATIC] Starting auto-generation for ${feedItemsForGeneration.length} items...`);

    // Triggera l'auto-generazione
    const autoGenResult = await autoGenerator.generateFromFeedItems({
      sourceId,
      feedItems: feedItemsForGeneration
    });

    if (autoGenResult.isSuccess()) {
      const result = autoGenResult.value;

      console.log(`✅ [PRAGMATIC] Auto-generation completed: ${result.summary.successful}/${result.summary.total} successful`);

      // Marca i FeedItems come processati
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

      return NextResponse.json({
        success: true,
        summary: result.summary,
        generatedArticles: result.generatedArticles.map(r => ({
          feedItemId: r.feedItemId,
          articleId: r.articleId,
          success: r.success,
          error: r.error
        })),
        message: `Auto-generation completed: ${result.summary.successful} articles generated`
      });

    } else {
      console.error('❌ [PRAGMATIC] Auto-generation failed:', autoGenResult.error);
      return NextResponse.json({
        success: false,
        error: 'Auto-generation failed',
        details: autoGenResult.error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PRAGMATIC] Auto-generation trigger failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}