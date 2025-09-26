import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { SingleStepArticleGenerationService } from '@/modules/content/infrastructure/services/SingleStepArticleGenerationService';

/**
 * POST /api/admin/generate-article-manually
 * Generates an article manually from a specific feed item using unified single-step workflow:
 * - Uses only Perplexity with customizable prompts for title, content, and SEO
 * - Combines feed content with user prompts in one API call
 * - Simpler, faster, and more cost-effective than the previous 3-step approach
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting unified single-step article generation...');
    const body = await request.json();

    // Validate required fields
    if (!body.feedItemId) {
      return NextResponse.json(
        { error: 'Missing required field: feedItemId' },
        { status: 400 }
      );
    }

    // Get the feed item with source information
    const feedItem = await prisma.feedItem.findUnique({
      where: { id: body.feedItemId },
      include: {
        source: true
      }
    });

    if (!feedItem) {
      return NextResponse.json(
        { error: 'Feed item not found' },
        { status: 404 }
      );
    }

    // Check if article already exists for this feed item
    if (feedItem.articleId) {
      return NextResponse.json(
        { error: 'Article already generated for this feed item' },
        { status: 400 }
      );
    }

    // Get user generation settings
    const userId = request.headers.get('x-user-id') || 'demo-user';
    let settings = await prisma.generationSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.generationSettings.create({
        data: {
          userId,
          titlePrompt: 'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.',
          contentPrompt: 'Scrivi un articolo completo e ben strutturato basato su questo contenuto. L\'articolo deve essere originale, coinvolgente e ben formattato con paragrafi chiari.',
          seoPrompt: 'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.'
        }
      });
    }

    // Use custom prompts if provided, otherwise use default settings
    const titlePrompt = body.customPrompts?.titlePrompt || settings.titlePrompt;
    const contentPrompt = body.customPrompts?.contentPrompt || settings.contentPrompt;
    const seoPrompt = body.customPrompts?.seoPrompt || settings.seoPrompt;

    // Get API key from environment variables (only Perplexity needed)
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

    if (!perplexityApiKey) {
      console.error('Missing Perplexity API key');
      return NextResponse.json(
        { error: 'AI service not configured. Missing Perplexity API key.' },
        { status: 500 }
      );
    }

    // Initialize the unified single-step generation service
    const generationService = new SingleStepArticleGenerationService(perplexityApiKey);

    console.log('🔧 Starting single-step generation for feed item:', feedItem.id);

    // Execute the unified workflow
    const generationResult = await generationService.generateArticle({
      feedItemContent: feedItem.content,
      feedItemTitle: feedItem.title,
      feedItemUrl: feedItem.url,
      customPrompts: {
        titlePrompt,
        contentPrompt,
        seoPrompt
      },
      settings: {
        model: body.settings?.model || settings.defaultModel,
        temperature: body.settings?.temperature || settings.defaultTemperature,
        maxTokens: body.settings?.maxTokens || settings.defaultMaxTokens,
        language: body.settings?.language || settings.defaultLanguage,
        tone: body.settings?.tone || settings.defaultTone,
        style: body.settings?.style || settings.defaultStyle,
        targetAudience: body.settings?.targetAudience || settings.defaultTargetAudience
      }
    });

    if (generationResult.isFailure()) {
      console.error('❌ Single-step generation failed:', generationResult.error);
      return NextResponse.json(
        {
          error: 'Article generation failed',
          details: generationResult.error.message,
          errorDetails: generationResult.error.details
        },
        { status: 500 }
      );
    }

    const result = generationResult.value;
    console.log('✅ Single-step generation completed successfully!');

    // Create the article with generated content
    const article = await prisma.article.create({
      data: {
        title: result.title,
        content: result.content,
        status: 'generated',
        sourceId: feedItem.sourceId
      }
    });

    // Mark feed item as processed and link to article
    await prisma.feedItem.update({
      where: { id: feedItem.id },
      data: {
        processed: true,
        articleId: article.id
      }
    });

    console.log('💾 Article saved to database:', article.id);

    return NextResponse.json({
      success: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          status: article.status,
          createdAt: article.createdAt.toISOString(),
          sourceId: article.sourceId
        },
        feedItem: {
          id: feedItem.id,
          processed: true,
          articleId: article.id
        },
        generationMetadata: {
          totalCost: result.cost,
          totalTime: result.generationTime,
          model: result.model,
          workflow: 'single-step-unified',
          metaDescription: result.metaDescription,
          seoTags: result.seoTags,
          statistics: result.statistics
        }
      }
    });

  } catch (error) {
    console.error('💥 Manual article generation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}