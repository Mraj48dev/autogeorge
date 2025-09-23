import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { ThreeStepArticleGenerationService } from '@/modules/content/infrastructure/services/ThreeStepArticleGenerationService';

/**
 * POST /api/admin/generate-article-manually
 * Generates an article manually from a specific feed item using 3-step AI workflow:
 * 1. Perplexity research from original URL
 * 2. ChatGPT content generation with user prompts
 * 3. ChatGPT optimization (title, SEO, metadata)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting 3-step article generation...');
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

    // Validate that feed item has URL for Perplexity research
    if (!feedItem.url) {
      return NextResponse.json(
        { error: 'Feed item must have URL for article generation' },
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

    // Get API keys from environment variables
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!perplexityApiKey || !openaiApiKey) {
      console.error('Missing API keys:', { perplexity: !!perplexityApiKey, openai: !!openaiApiKey });
      return NextResponse.json(
        { error: 'AI services not configured. Missing API keys.' },
        { status: 500 }
      );
    }

    // Initialize the 3-step generation service
    const generationService = new ThreeStepArticleGenerationService(
      perplexityApiKey,
      openaiApiKey
    );

    console.log('🔧 Starting 3-step generation for URL:', feedItem.url);

    // Execute the 3-step workflow
    const generationResult = await generationService.generateArticle({
      articleUrl: feedItem.url,
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
      console.error('❌ 3-step generation failed:', generationResult.error);
      return NextResponse.json(
        {
          error: `Article generation failed at step ${generationResult.error.step}`,
          details: generationResult.error.error,
          step: generationResult.error.step
        },
        { status: 500 }
      );
    }

    const result = generationResult.value;
    console.log('✅ 3-step generation completed successfully!');

    // Create the article with generated content
    const article = await prisma.article.create({
      data: {
        title: result.step3.optimizedTitle,
        content: result.step2.finalArticle,
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
          totalCost: result.totalCost,
          totalTime: result.totalTime,
          steps: {
            step1: 'Perplexity research completed',
            step2: 'ChatGPT content generation completed',
            step3: 'ChatGPT optimization completed'
          },
          sources: result.step1.sources,
          metaDescription: result.step3.metaDescription,
          seoTags: result.step3.seoTags
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