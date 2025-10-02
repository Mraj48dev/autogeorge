import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { Article, GenerationParameters, ArticleAutomationSettings } from '../../domain/entities/Article';
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { AiService } from '../../domain/ports/AiService';
import { Title } from '../../domain/value-objects/Title';
import { Content } from '../../domain/value-objects/Content';
import { ArticleId } from '../../domain/value-objects/ArticleId';
import { ArticleStatus } from '../../domain/value-objects/ArticleStatus';
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

              // ✅ CLEAN ARCHITECTURE: Only generate article, let separate crons handle image/publish
              console.log(`✅ [AutoGen] Article created with status: ${article.status.getValue()}`);
              console.log(`🔄 [AutoGen] Workflow: Separate crons will handle image generation and publishing`);

              results.push({
                feedItemId: feedItem.id,
                articleId: articleId,
                success: true
              });

              this.logger.info('Article generated and saved successfully', {
                feedItemId: feedItem.id,
                articleId: articleId,
                articleTitle: article.title.getValue(),
                articleStatus: article.status.getValue(),
                featuredImageEnabled: request.enableFeaturedImage,
                autoPublishEnabled: request.enableAutoPublish,
                note: 'Image generation and publishing will be handled by separate cron jobs'
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
   * @deprecated Use Article.createGenerated() with automationSettings instead
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
    // Use the centralized logic from Article domain entity
    const automationSettings = {
      enableFeaturedImage,
      enableAutoPublish
    };

    console.log(`🔧 [AutoGen] AUTOMATION FLAGS DEBUG:`, {
      enableFeaturedImage,
      enableAutoPublish,
      sourceId,
      feedItemTitle: title.getValue().substring(0, 50) + '...'
    });

    const article = Article.createGenerated(
      title,
      content,
      sourceId,
      generationParams,
      seoMetadata,
      undefined, // articleData
      automationSettings
    );

    console.log(`🎯 [AutoGen] FINAL STATUS ASSIGNED:`, {
      statusValue: article.status.getValue(),
      enableFeaturedImage,
      enableAutoPublish
    });

    return article;
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

    // 🔍 CHECK CONTENT FORMAT: HTML vs Markdown
    const isHtml = contentValue.includes('<') && contentValue.includes('>');
    const isMarkdown = contentValue.includes('##') || contentValue.includes('**') || contentValue.includes('*');
    console.log(`📝 [AutoGen] CONTENT FORMAT CHECK:`, {
      feedItemId: feedItem.id,
      isHtml,
      isMarkdown,
      contentStart: contentValue.substring(0, 200),
      promptIncludesHtml: this.buildPrompt(feedItem, settings).includes('HTML')
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
- IMPORTANTE: Usa SOLO tag HTML semantici: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- NON usare markdown (*, **, #, ##) - SOLO HTML
- Il contenuto deve essere formattato ESCLUSIVAMENTE in HTML pulito e semantico
- La meta description deve essere max 160 caratteri
- Includi 3-5 tag SEO pertinenti
- L'articolo deve essere originale e ben strutturato

Genera l'articolo ora:`;
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