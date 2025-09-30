import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * 🤖 AUTO-GENERATION CRON JOB - REAL CONTENT MODULE WITH PERPLEXITY AI
 *
 * This cron processes draft feed items and generates real articles using:
 * - Sources Module → Content Module integration
 * - ContentModuleArticleAutoGenerator adapter
 * - Real AutoGenerateArticles use case with Perplexity AI
 * - Proper article status workflow based on WordPress automation settings
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🤖 [REAL AutoGeneration] Starting with Content Module + Perplexity AI...');

    // Check if WordPress site exists and auto-generation is enabled
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite || !wordpressSite.enableAutoGeneration) {
      console.log('⏸️ Auto-generation disabled or no active site');
      return NextResponse.json({
        success: true,
        message: 'Auto-generation disabled or no active site',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    console.log('✅ Auto-generation enabled - using Content Module with Perplexity AI');

    // Find feed items with status 'draft' (ready to process)
    const draftFeedItems = await prisma.feedItem.findMany({
      where: {
        status: 'draft',
        articleId: null  // Not yet processed
      },
      take: 3, // Process up to 3 items per cron run to avoid timeouts
      orderBy: { fetchedAt: 'asc' } // Process oldest first
    });

    console.log(`📊 Found ${draftFeedItems.length} draft feed items ready for processing`);

    if (draftFeedItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No draft feed items to process',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    // Log what we're about to process
    draftFeedItems.forEach((item, index) => {
      console.log(`  ${index + 1}. 📝 "${item.title}" (${item.id}) from source ${item.sourceId}`);
    });

    // Initialize Sources Container which has ContentModuleArticleAutoGenerator
    const sourcesContainer = createSourcesContainer();

    // Use the real Content Module through Sources Module adapter
    // This will call: ContentModuleArticleAutoGenerator → AutoGenerateArticles → Perplexity AI
    const autoGenResult = await sourcesContainer.articleAutoGenerator.generateFromFeedItems({
      sourceId: draftFeedItems[0].sourceId, // Use first item's source ID
      feedItems: draftFeedItems.map(item => ({
        id: item.id,
        guid: item.guid || item.id,
        title: item.title,
        content: item.content,
        url: item.url,
        publishedAt: item.publishedAt
      })),
      enableFeaturedImage: wordpressSite.enableFeaturedImage || false,
      enableAutoPublish: wordpressSite.enableAutoPublish || false
    });

    if (autoGenResult.isFailure()) {
      console.error('❌ Content Module auto-generation failed:', autoGenResult.error);
      return NextResponse.json({
        success: false,
        error: 'Content Module auto-generation failed',
        details: autoGenResult.error.message
      }, { status: 500 });
    }

    const result = autoGenResult.value;
    console.log(`✅ Content Module completed: ${result.summary.successful}/${result.summary.total} articles generated with Perplexity AI`);

    // Update feed items status to 'processed' for successful generations
    let updatedItems = 0;
    for (const genResult of result.generatedArticles) {
      if (genResult.success && genResult.articleId) {
        await prisma.feedItem.update({
          where: { id: genResult.feedItemId },
          data: {
            status: 'processed',
            articleId: genResult.articleId,
            processed: true // Keep for backward compatibility
          }
        });
        updatedItems++;
        console.log(`📝 Updated feed item ${genResult.feedItemId} → status: processed, articleId: ${genResult.articleId}`);
      }
    }

    console.log(`🎯 Final results: ${result.summary.successful} articles generated, ${updatedItems} feed items updated to processed`);

    return NextResponse.json({
      success: true,
      message: `Generated ${result.summary.successful} articles using Content Module with Perplexity AI`,
      results: {
        processed: draftFeedItems.length,
        successful: result.summary.successful,
        failed: result.summary.failed,
        updatedFeedItems: updatedItems,
        generatedArticles: result.generatedArticles.filter(r => r.success).map(r => r.articleId)
      }
    });

  } catch (error) {
    console.error('💥 Error in REAL auto-generation with Content Module:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error in Content Module auto-generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}