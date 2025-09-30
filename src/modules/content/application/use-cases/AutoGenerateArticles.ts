import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { Article, GenerationParameters } from '../../domain/entities/Article';
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { AiService } from '../../domain/ports/AiService';
import { Title } from '../../domain/value-objects/Title';
import { Content } from '../../domain/value-objects/Content';
import { ArticleId } from '../../domain/value-objects/ArticleId';
import { ArticleStatus } from '../../domain/value-objects/ArticleStatus';
import { PublishingContent } from '../../../publishing/domain/ports/PublishingService';
import { Logger } from '../../infrastructure/logger/Logger';

/**
 * Use case for automatically generating articles from feed items
 * based on source configuration
 */
export class AutoGenerateArticles implements UseCase<AutoGenerateRequest, AutoGenerateResponse> {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly aiService: AiService,
    private readonly logger: Logger
  ) {}

  async execute(request: AutoGenerateRequest): Promise<Result<AutoGenerateResponse>> {
    try {
      this.logger.info('Starting auto-generation for feed items', {
        feedItemsCount: request.feedItems.length,
        sourceId: request.sourceId
      });

      const results: ArticleGenerationResult[] = [];

      for (const feedItem of request.feedItems) {
        try {
          const article = await this.generateArticleFromFeedItem(
            feedItem,
            request.sourceId,
            request.generationSettings,
            request.enableFeaturedImage || false,
            request.enableAutoPublish || false
          );

          if (article) {
            // 🚨 CRITICAL FIX: Check Result from repository.save()
            const saveResult = await this.articleRepository.save(article);

            if (saveResult.isSuccess()) {
              const articleId = article.id.getValue();

              // 🎨 Generate featured image if enabled
              if (request.enableFeaturedImage) {
                try {
                  console.log(`🎨 [AutoGen] Generating featured image for article: ${articleId}`);
                  await this.autoGenerateImage(articleId);
                  this.logger.info('Featured image generation completed successfully', {
                    articleId,
                    feedItemId: feedItem.id
                  });
                } catch (imageError) {
                  console.warn(`⚠️ [AutoGen] Featured image generation failed for article ${articleId}:`, imageError);
                  // Continue without failing the entire generation
                }
              }

              // 📤 Auto-publish if enabled
              if (request.enableAutoPublish) {
                try {
                  console.log(`📤 [AutoGen] Auto-publishing article: ${articleId}`);
                  await this.autoPublishArticle(articleId);
                  this.logger.info('Auto-publishing completed successfully', {
                    articleId,
                    feedItemId: feedItem.id
                  });
                } catch (publishError) {
                  console.warn(`⚠️ [AutoGen] Auto-publishing failed for article ${articleId}:`, publishError);
                  // Continue without failing the entire generation
                }
              }

              results.push({
                feedItemId: feedItem.id,
                articleId: articleId,
                success: true
              });

              this.logger.info('Article generated and saved successfully', {
                feedItemId: feedItem.id,
                articleId: articleId,
                articleTitle: article.title.getValue(),
                featuredImageEnabled: request.enableFeaturedImage,
                autoPublishEnabled: request.enableAutoPublish
              });
            } else {
              // Save failed - log the error and mark as failed
              this.logger.error('Failed to save generated article to database', {
                feedItemId: feedItem.id,
                articleId: article.id.getValue(),
                saveError: saveResult.error
              });

              results.push({
                feedItemId: feedItem.id,
                success: false,
                error: `Database save failed: ${saveResult.error.message || 'Unknown error'}`
              });
            }
          } else {
            results.push({
              feedItemId: feedItem.id,
              success: false,
              error: 'Failed to generate article content'
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            feedItemId: feedItem.id,
            success: false,
            error: errorMessage
          });

          this.logger.error('Failed to generate article for feed item', {
            feedItemId: feedItem.id,
            error: errorMessage
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.info('Auto-generation completed', {
        sourceId: request.sourceId,
        total: results.length,
        successful,
        failed
      });

      return Result.success({
        results,
        summary: {
          total: results.length,
          successful,
          failed
        }
      });

    } catch (error) {
      this.logger.error('Auto-generation process failed', { error });
      return Result.failure(`Auto-generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates article with correct initial status based on automation flags
   */
  private createGeneratedWithWorkflow(
    title: Title,
    content: Content,
    sourceId: string,
    generationParams: GenerationParameters,
    seoMetadata?: any,
    enableFeaturedImage: boolean = false,
    enableAutoPublish: boolean = false
  ): Article {
    const id = ArticleId.generate();

    // Determine correct initial status based on automation workflow
    let initialStatus: ArticleStatus;

    if (enableAutoPublish && enableFeaturedImage) {
      // Both enabled: generated → generated_image_draft → generated_with_image → ready_to_publish → published
      initialStatus = ArticleStatus.generatedImageDraft();
    } else if (enableAutoPublish && !enableFeaturedImage) {
      // Only auto-publish: generated → ready_to_publish → published
      initialStatus = ArticleStatus.readyToPublish();
    } else if (!enableAutoPublish && enableFeaturedImage) {
      // Only image generation: generated → generated_image_draft → generated_with_image (manual publish)
      initialStatus = ArticleStatus.generatedImageDraft();
    } else {
      // Neither enabled: generated (manual image + manual publish)
      initialStatus = ArticleStatus.generated();
    }

    return new Article(
      id,
      title,
      content,
      initialStatus,
      seoMetadata,
      sourceId,
      generationParams
    );
  }

  private async generateArticleFromFeedItem(
    feedItem: FeedItemData,
    sourceId: string,
    settings: GenerationSettings,
    enableFeaturedImage: boolean = false,
    enableAutoPublish: boolean = false
  ): Promise<Article | null> {
    // Generate content using AI service with unified workflow
    const generateResult = await this.aiService.generateArticle({
      prompt: this.buildPrompt(feedItem, settings),
      model: settings.model || 'sonar-pro',
      sourceContent: feedItem.content,
      language: settings.language || 'it',
      tone: settings.tone || 'professionale',
      style: settings.style || 'giornalistico',
      targetAudience: settings.targetAudience || 'generale',
      targetWordCount: settings.maxTokens ? Math.floor(settings.maxTokens * 0.75) : undefined,
      parameters: {
        model: settings.model || 'sonar-pro',
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 2000
      },
      metadata: {
        requestId: `auto-gen-${feedItem.id}-${Date.now()}`,
        context: {
          sourceUrl: feedItem.url,
          publishedAt: feedItem.publishedAt.toISOString(),
          originalTitle: feedItem.title
        }
      }
    });

    if (!generateResult.isSuccess()) {
      this.logger.error('AI service failed to generate article', {
        feedItemId: feedItem.id,
        error: generateResult.error
      });
      return null;
    }

    const generated = generateResult.value;

    // 🚨 DEBUG: Log what AI service returned
    this.logger.info('AI service returned data', {
      feedItemId: feedItem.id,
      hasTitle: !!generated.title,
      titleLength: generated.title?.length || 0,
      titlePreview: generated.title?.substring(0, 50) || 'EMPTY',
      hasContent: !!generated.content,
      contentLength: generated.content?.length || 0,
      contentPreview: generated.content?.substring(0, 100) || 'EMPTY',
      fullGenerated: generated
    });

    // 🚨 CRITICAL DEBUG: Log what we're about to pass to value objects
    this.logger.info('About to create value objects [CRITICAL-DEBUG-v3]', {
      feedItemId: feedItem.id,
      generatedKeys: Object.keys(generated),
      generatedTitleType: typeof generated.title,
      generatedTitleValue: generated.title,
      generatedTitleLength: generated.title?.length,
      generatedContentType: typeof generated.content,
      generatedContentValue: generated.content?.substring(0, 100),
      generatedContentLength: generated.content?.length,
      fullGeneratedObject: generated
    });

    // Extract title and content with explicit null checking and force string conversion
    const titleValue = String(generated?.title || generated?.fullGenerated?.title || 'Generated Article');
    const contentValue = String(generated?.content || generated?.fullGenerated?.content || 'Generated content');

    // 🚨 FINAL DEBUG: What are we actually passing to Value Objects?
    this.logger.info('FINAL VALUE OBJECTS INPUT [DEBUG-v4]', {
      feedItemId: feedItem.id,
      titleValue,
      titleType: typeof titleValue,
      titleLength: titleValue?.length || 0,
      contentValue: contentValue?.substring(0, 100) || 'EMPTY',
      contentType: typeof contentValue,
      contentLength: contentValue?.length || 0
    });

    // Create article entity
    const title = Title.create(titleValue);
    const content = Content.create(contentValue);

    if (!title.isSuccess() || !content.isSuccess()) {
      this.logger.error('Failed to create article value objects', {
        feedItemId: feedItem.id,
        titleError: title.isFailure() ? title.error : null,
        contentError: content.isFailure() ? content.error : null
      });
      return null;
    }

    // Determine initial status based on automation flags
    const generationParams = {
      prompt: this.buildPrompt(feedItem, settings),
      model: settings.model || 'sonar-pro',
      temperature: settings.temperature || 0.7,
      maxTokens: settings.maxTokens || 2000,
      language: settings.language || 'it',
      tone: settings.tone || 'professionale',
      style: settings.style || 'giornalistico',
      targetAudience: settings.targetAudience || 'generale'
    };

    return this.createGeneratedWithWorkflow(
      title.value,
      content.value,
      sourceId,
      generationParams,
      generated.seoMetadata,
      enableFeaturedImage,
      enableAutoPublish
    );
  }

  private buildPrompt(feedItem: FeedItemData, settings: GenerationSettings): string {
    const titlePrompt = settings.titlePrompt ||
      'Crea un titolo accattivante e SEO-friendly per questo articolo';

    const contentPrompt = settings.contentPrompt ||
      'Scrivi un articolo completo e ben strutturato basato su questo contenuto';

    const seoPrompt = settings.seoPrompt ||
      'Includi meta description, tags e parole chiave ottimizzate per i motori di ricerca';

    return `
Genera un articolo completo in formato JSON con questa struttura esatta:

\`\`\`json
{
  "title": "...",
  "content": "...",
  "metaDescription": "...",
  "seoTags": ["tag1", "tag2", "tag3"]
}
\`\`\`

ISTRUZIONI DETTAGLIATE:

TITOLO:
${titlePrompt}

CONTENUTO:
${contentPrompt}

SEO E METADATA:
${seoPrompt}

CONTENUTO SORGENTE DA ELABORARE:
Titolo originale: ${feedItem.title}
Contenuto: ${feedItem.content}
${feedItem.url ? `URL originale: ${feedItem.url}` : ''}
Data pubblicazione: ${feedItem.publishedAt}

PARAMETRI DI STILE:
- Lingua: ${settings.language || 'italiano'}
- Tono: ${settings.tone || 'professionale'}
- Stile: ${settings.style || 'giornalistico'}
- Target audience: ${settings.targetAudience || 'generale'}

REQUISITI TECNICI:
- Rispondi SOLO con il JSON valido
- Non aggiungere testo prima o dopo il JSON
- Il contenuto deve essere formattato in HTML pulito
- La meta description deve essere max 160 caratteri
- Includi 3-5 tag SEO pertinenti
- L'articolo deve essere originale e ben strutturato

Genera l'articolo ora:`;
  }

  /**
   * Auto-publish article to WordPress
   */
  private async autoPublishArticle(articleId: string): Promise<void> {
    try {
      console.log(`📤 [AutoPublish] Starting auto-publish for article: ${articleId}`);

      // Get article from database
      const article = await this.articleRepository.findById(articleId);
      if (!article) {
        throw new Error(`Article not found: ${articleId}`);
      }

      // Get WordPress settings
      const { prisma } = await import('@/shared/database/prisma');
      const wordpressSite = await prisma.wordPressSite.findFirst({
        where: { isActive: true }
      });

      if (!wordpressSite) {
        throw new Error('No active WordPress site found for auto-publishing');
      }

      console.log(`🎯 [AutoPublish] Found WordPress site: ${wordpressSite.name}`);

      // Use services directly instead of simulating HTTP calls
      const { PrismaPublicationRepository } = await import('@/modules/publishing/infrastructure/repositories/PrismaPublicationRepository');
      const { WordPressPublishingService } = await import('@/modules/publishing/infrastructure/services/WordPressPublishingService');
      const { PublishArticle } = await import('@/modules/publishing/application/use-cases/PublishArticle');
      const { PublicationTarget } = await import('@/modules/publishing/domain/value-objects/PublicationTarget');

      // Initialize services
      const publicationRepository = new PrismaPublicationRepository();
      const publishingService = new WordPressPublishingService();
      const publishArticle = new PublishArticle(publicationRepository, publishingService);

      // Create proper publication target using WordPress factory method (FIXED: correct parameter order)
      const publicationTarget = PublicationTarget.wordpress(
        wordpressSite.id,     // siteId first (CORRECT ORDER)
        wordpressSite.url,    // siteUrl second (CORRECT ORDER)
        {
          username: wordpressSite.username,
          password: wordpressSite.password,
          status: wordpressSite.defaultStatus || 'publish'
        }
      );

      const content: PublishingContent = {
        title: article.title || 'Generated Article', // Direct access to database field
        content: article.content || 'Generated content', // Direct access to database field
        excerpt: (article.title || 'Generated Article').substring(0, 150), // Extract from title if needed
        featuredImageUrl: article.featuredMediaUrl || undefined, // Use featured media URL if available
        attachments: []
      };

      const metadata = {
        articleId: articleId,
        sourceId: article.sourceId || '',
        generatedAt: new Date(),
        autoPublished: true
      };

      // Execute publication
      const result = await publishArticle.execute({
        articleId,
        target: publicationTarget,
        content,
        metadata
      });

      if (result.isFailure()) {
        throw new Error(`Publishing failed: ${result.error.message}`);
      }

      const publicationData = result.value;
      console.log(`✅ [AutoPublish] Article published successfully: ${articleId} → ${publicationData.externalUrl || 'WordPress'}`);

    } catch (error) {
      console.error(`❌ [AutoPublish] Failed to auto-publish article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-generate featured image for article using direct DALL-E API call
   */
  private async autoGenerateImage(articleId: string): Promise<void> {
    try {
      console.log(`🎨 [AutoImage] Starting auto-image generation for article: ${articleId}`);

      // Get article from database
      const article = await this.articleRepository.findById(articleId);
      if (!article) {
        throw new Error(`Article not found: ${articleId}`);
      }

      // Get OpenAI API key
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Generate image prompt based on article title and content
      const imagePrompt = this.generateImagePrompt(article.title, article.content);
      console.log(`🎨 [AutoImage] Generated prompt: ${imagePrompt}`);

      // Call OpenAI DALL-E API for image generation
      const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural',
          response_format: 'url'
        }),
      });

      if (!dalleResponse.ok) {
        const errorData = await dalleResponse.json();
        throw new Error(`DALL-E generation failed: ${errorData.error?.message || dalleResponse.status}`);
      }

      const dalleData = await dalleResponse.json();
      const imageUrl = dalleData.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error('DALL-E did not return an image URL');
      }

      // Update article with featured image URL
      const { prisma } = await import('@/shared/database/prisma');
      await prisma.article.update({
        where: { id: articleId },
        data: {
          featuredMediaUrl: imageUrl
        }
      });

      console.log(`✅ [AutoImage] Featured image generated successfully: ${articleId} → ${imageUrl}`);

    } catch (error) {
      console.error(`❌ [AutoImage] Failed to auto-generate image for article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * Generate image prompt based on article content
   */
  private generateImagePrompt(title: string, content: string): string {
    // Extract key themes from title and content for image generation
    const cleanTitle = title.replace(/[^\w\s]/gi, '').toLowerCase();

    // Create a focused prompt for DALL-E
    const prompt = `Create a professional, high-quality featured image for an article titled: "${title}".
The image should be:
- Modern and clean design
- Relevant to the article topic
- Professional and engaging
- Suitable for a news/blog website
- No text overlays
- High contrast and clear
Style: photorealistic, modern, clean`;

    return prompt;
  }
}

export interface AutoGenerateRequest {
  sourceId: string;
  feedItems: FeedItemData[];
  generationSettings: GenerationSettings;
  enableFeaturedImage?: boolean; // Enable featured image generation
  enableAutoPublish?: boolean; // Enable auto-publishing to WordPress
}

export interface AutoGenerateResponse {
  results: ArticleGenerationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface FeedItemData {
  id: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
}

export interface GenerationSettings {
  titlePrompt?: string;
  contentPrompt?: string;
  seoPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  tone?: string;
  style?: string;
  targetAudience?: string;
}

export interface ArticleGenerationResult {
  feedItemId: string;
  articleId?: string;
  success: boolean;
  error?: string;
}