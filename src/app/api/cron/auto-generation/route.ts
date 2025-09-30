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

    // 🔧 LOG: WordPress automation settings for debugging
    console.log('🎯 [DEBUG] WordPress automation settings:', {
      siteId: wordpressSite.id,
      siteName: wordpressSite.name,
      enableAutoGeneration: wordpressSite.enableAutoGeneration,
      enableAutoPublish: wordpressSite.enableAutoPublish,
      enableFeaturedImage: wordpressSite.enableFeaturedImage,
      isActive: wordpressSite.isActive
    });

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

    // 🔧 LOG: Automation flags being passed to Content Module
    const automationFlags = {
      enableFeaturedImage: wordpressSite.enableFeaturedImage || false,
      enableAutoPublish: wordpressSite.enableAutoPublish || false
    };
    console.log('🎯 [DEBUG] Automation flags passed to Content Module:', automationFlags);

    // Use the real Content Module through Sources Module adapter
    // This will call: ContentModuleArticleAutoGenerator → AutoGenerateArticles → Perplexity AI
    console.log('🚀 [DEBUG] Calling sourcesContainer.articleAutoGenerator.generateFromFeedItems...');
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
      enableFeaturedImage: automationFlags.enableFeaturedImage,
      enableAutoPublish: automationFlags.enableAutoPublish
    });

    console.log('📋 [DEBUG] Auto-generation result:', {
      success: autoGenResult.isSuccess(),
      error: autoGenResult.isFailure() ? autoGenResult.error : null
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

    // 🔧 LOG: Details of each generated article
    result.generatedArticles.forEach((genResult, index) => {
      if (genResult.success) {
        console.log(`  ✅ Article ${index + 1}: ${genResult.articleId} - Status: ${genResult.status || 'unknown'}`);
      } else {
        console.log(`  ❌ Article ${index + 1}: Failed - ${genResult.error}`);
      }
    });

    // 🔧 LOG: Check the actual status of created articles in database
    if (result.generatedArticles.some(r => r.success)) {
      const createdArticleIds = result.generatedArticles.filter(r => r.success).map(r => r.articleId);
      console.log('🔍 [DEBUG] Checking actual article statuses in database...');

      for (const articleId of createdArticleIds) {
        try {
          const article = await prisma.article.findUnique({
            where: { id: articleId },
            select: { id: true, title: true, status: true, createdAt: true }
          });
          if (article) {
            console.log(`  📊 Article ${article.id}: STATUS="${article.status}" title="${article.title.substring(0, 50)}..."`);
          }
        } catch (err) {
          console.log(`  ❌ Error checking article ${articleId}:`, err);
        }
      }
    }

    console.log(`🔄 Note: Feed item status updates are handled by Content Module adapter`);

    return NextResponse.json({
      success: true,
      message: `Generated ${result.summary.successful} articles using Content Module with Perplexity AI`,
      results: {
        processed: draftFeedItems.length,
        successful: result.summary.successful,
        failed: result.summary.failed,
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