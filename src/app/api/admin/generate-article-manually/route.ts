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
          seoPrompt: 'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.',
          defaultModel: 'sonar-pro'
        }
      });
    }

    // Get WordPress configuration for image upload (if available)
    const wordpressSite = await prisma.wordPressSite.findUnique({
      where: { userId }
    });

    let wordpressConfig = undefined;
    if (wordpressSite && body.generateFeaturedImage) {
      wordpressConfig = {
        siteUrl: wordpressSite.url,
        username: wordpressSite.username,
        password: wordpressSite.password
      };
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
      },
      wordpressConfig,
      generateFeaturedImage: body.generateFeaturedImage || false
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

    // Extract advanced data from the new structure
    const advancedData = result.rawResponse?.article || {};

    // Create the article with generated content and ALL metadata
    const article = await prisma.article.create({
      data: {
        title: result.title,
        content: result.content,
        status: 'generated',
        sourceId: feedItem.sourceId,

        // ✅ ENHANCED: Extract and save advanced article data
        slug: advancedData.basic_data?.slug || null,

        // ✅ SAVE COMPLETE RAW RESPONSE WITH ADVANCED STRUCTURE
        articleData: result.rawResponse || {
          title: result.title,
          content: result.content,
          metaDescription: result.metaDescription,
          seoTags: result.seoTags,
          statistics: result.statistics
        },

        // ✅ ENHANCED: Extract advanced SEO data
        yoastSeo: advancedData.seo_critical ? {
          focus_keyword: advancedData.seo_critical.focus_keyword,
          seo_title: advancedData.seo_critical.seo_title,
          meta_description: advancedData.seo_critical.meta_description,
          h1_tag: advancedData.seo_critical.h1_tag,
          related_keywords: advancedData.internal_seo?.related_keywords || [],
          entities: advancedData.internal_seo?.entities || [],
          internal_links: advancedData.internal_seo?.internal_links || []
        } : null,

        // ✅ ENHANCED: Save advanced tags and categories
        tags: advancedData.basic_data?.tags ? {
          primary: advancedData.basic_data.tags,
          related: advancedData.internal_seo?.related_keywords?.slice(0, 10) || []
        } : null,

        // ✅ ENHANCED: Custom fields for advanced data
        customFields: {
          category: advancedData.basic_data?.category,
          reading_time: advancedData.user_engagement?.reading_time,
          cta: advancedData.user_engagement?.cta,
          key_takeaways: advancedData.user_engagement?.key_takeaways || [],
          featured_image_prompt: advancedData.featured_image?.ai_prompt,
          featured_image_alt: advancedData.featured_image?.alt_text,
          featured_image_filename: advancedData.featured_image?.filename,
          focus_keyword: advancedData.seo_critical?.focus_keyword,
          structure_version: 'advanced_v1'
        },

        // AI generation metadata
        aiModel: result.model,
        aiPrompts: {
          titlePrompt,
          contentPrompt,
          seoPrompt,
          feedItemContent: feedItem.content,
          feedItemTitle: feedItem.title,
          feedItemUrl: feedItem.url,
          unifiedPromptSent: result.promptSent // ✅ Save the exact prompt sent to Perplexity
        },

        // Generation configuration for reproducibility
        generationConfig: {
          model: body.settings?.model || settings.defaultModel,
          temperature: body.settings?.temperature || settings.defaultTemperature,
          maxTokens: body.settings?.maxTokens || settings.defaultMaxTokens,
          language: body.settings?.language || settings.defaultLanguage,
          tone: body.settings?.tone || settings.defaultTone,
          style: body.settings?.style || settings.defaultStyle,
          targetAudience: body.settings?.targetAudience || settings.defaultTargetAudience,
          cost: result.cost,
          generationTime: result.generationTime
        },

        // Featured image data
        featuredMediaId: result.featuredImageId || null,
        featuredMediaUrl: result.featuredImageUrl || null
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

    // ✅ AUTO-PUBLISHING: Try to publish automatically to WordPress if configured
    let publishingResult = null;
    try {
      // Check if auto-publishing is enabled and WordPress is configured
      const autoPublishEnabled = body.autoPublish !== false; // Default to true unless explicitly disabled

      if (autoPublishEnabled && wordpressConfig) {
        console.log('🚀 [Auto-Publishing] Attempting automatic WordPress publication...');

        // Import and use WordPress publishing service
        const { WordPressPublishingService } = await import('@/modules/publishing/infrastructure/services/WordPressPublishingService');
        const { PublicationTarget } = await import('@/modules/publishing/domain/value-objects/PublicationTarget');

        const publishingService = new WordPressPublishingService();

        // Create publication target
        const target = PublicationTarget.wordpress(
          wordpressSite.url,
          wordpressSite.id,
          {
            username: wordpressSite.username,
            password: wordpressSite.password,
            status: wordpressSite.defaultStatus || 'publish'
          }
        );

        // ✅ FIXED: Extract content from new advanced structure
        const articleContent = advancedData.content || result.content;
        const articleTitle = advancedData.basic_data?.title || result.title;
        const articleSlug = advancedData.basic_data?.slug || null;
        const articleTags = advancedData.basic_data?.tags || result.seoTags || [];
        const articleMetaDescription = advancedData.seo_critical?.meta_description || result.metaDescription;
        const articleCategory = advancedData.basic_data?.category || null;

        // Prepare content for publishing
        const publishingContent = {
          title: articleTitle,
          content: articleContent,
          excerpt: articleMetaDescription || articleTitle.substring(0, 150),
          slug: articleSlug
        };

        // ✅ FIXED: WordPress expects tag names as strings, not IDs
        // WordPress will create tags automatically if they don't exist
        const publishingMetadata = {
          title: articleTitle,
          excerpt: articleMetaDescription,
          categories: wordpressSite.defaultCategory ? [wordpressSite.defaultCategory] : [],
          tags: articleTags, // WordPress REST API accepts tag names as strings
          author: wordpressSite.defaultAuthor,
          featuredMediaId: result.featuredImageId,
          slug: articleSlug,
          category_name: articleCategory // Category as name, not ID
        };

        // Attempt to publish
        const publishResult = await publishingService.publish(target, publishingContent, publishingMetadata);

        if (publishResult.isSuccess()) {
          // Update article status to published
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'published',
              publishedAt: new Date()
            }
          });

          publishingResult = {
            success: true,
            externalId: publishResult.value.externalId,
            externalUrl: publishResult.value.externalUrl,
            publishedAt: new Date().toISOString()
          };

          console.log('✅ [Auto-Publishing] Article published successfully to WordPress!', publishResult.value.externalUrl);
        } else {
          publishingResult = {
            success: false,
            error: publishResult.error.message,
            details: publishResult.error.details
          };

          console.warn('⚠️ [Auto-Publishing] Failed to publish to WordPress:', publishResult.error.message);
        }
      } else {
        console.log('ℹ️ [Auto-Publishing] Skipped - auto-publishing disabled or WordPress not configured');
      }
    } catch (autoPublishError) {
      publishingResult = {
        success: false,
        error: 'Auto-publishing error',
        details: autoPublishError instanceof Error ? autoPublishError.message : 'Unknown error'
      };

      console.error('💥 [Auto-Publishing] Error during automatic publishing:', autoPublishError);
    }

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
          statistics: result.statistics,
          featuredImage: result.featuredImageId ? {
            id: result.featuredImageId,
            url: result.featuredImageUrl
          } : null
        },
        // ✅ Include auto-publishing result
        autoPublishing: publishingResult
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