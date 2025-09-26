import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * TEST FINALE DRASTICO: Ignora tutto e testa solo l'auto-generazione
 * Salta tutte le verifiche problematiche
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💀 [FINAL] DRASTIC FINAL AUTO-GENERATION TEST...');

    const sourceId = 'cmfzyrmw5jbbfpd8c';

    // STEP 1: FORZA configurazione nel database senza controlli
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        configuration: {
          enabled: true,
          maxItems: 10,
          pollingInterval: 60,
          autoGenerate: true // FORZA QUESTO!
        }
      }
    });

    console.log('✅ [FINAL] Configuration FORCED in database');

    // STEP 2: Crea FeedItem fresco
    await prisma.feedItem.deleteMany({ where: { sourceId } });

    const feedItem = await prisma.feedItem.create({
      data: {
        sourceId,
        guid: `FINAL-${Date.now()}`,
        title: 'FINAL TEST: Auto-Generation Must Work',
        content: 'This is the final test. If this doesn\'t work, there\'s a deeper issue. The auto-generation system should process this FeedItem and create an article using Perplexity AI.',
        url: `https://final.test/${Date.now()}`,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        processed: false,
      }
    });

    console.log('✅ [FINAL] FeedItem created:', feedItem.id);

    // STEP 3: Auto-generation DIRETTA
    const container = createSourcesContainer();

    const feedItems = [{
      id: feedItem.id,
      guid: feedItem.guid,
      title: feedItem.title,
      content: feedItem.content || '',
      url: feedItem.url,
      publishedAt: feedItem.publishedAt
    }];

    console.log('🚀 [FINAL] Starting AUTO-GENERATION...');

    const autoGenResult = await container.articleAutoGenerator.generateFromFeedItems({
      sourceId,
      feedItems
    });

    if (autoGenResult.isSuccess()) {
      const result = autoGenResult.value;

      console.log(`🎉 [FINAL] SUCCESS! Generated ${result.summary.successful} articles`);

      // Marca come processato
      for (const genResult of result.generatedArticles) {
        if (genResult.success && genResult.articleId) {
          await prisma.feedItem.update({
            where: { id: genResult.feedItemId },
            data: { processed: true, articleId: genResult.articleId }
          });
        }
      }

      const totalArticles = await prisma.article.count();

      return NextResponse.json({
        success: true,
        FINAL_RESULT: "AUTO-GENERATION WORKS!",
        summary: result.summary,
        feedItemId: feedItem.id,
        generatedArticles: result.generatedArticles,
        totalArticlesInDatabase: totalArticles,
        message: `🎉 FINAL SUCCESS: ${result.summary.successful} articles auto-generated!`
      });

    } else {
      console.error('❌ [FINAL] Auto-generation FAILED:', autoGenResult.error);
      return NextResponse.json({
        success: false,
        FINAL_RESULT: "AUTO-GENERATION FAILED",
        error: autoGenResult.error.message,
        feedItemId: feedItem.id
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 [FINAL] DRASTIC TEST FAILED:', error);
    return NextResponse.json({
      success: false,
      FINAL_RESULT: "COMPLETE FAILURE",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}