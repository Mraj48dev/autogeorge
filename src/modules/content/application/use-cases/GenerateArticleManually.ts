import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { Article, GenerationParameters } from '../../domain/entities/Article';
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { AiService } from '../../domain/ports/AiService';
import { Title } from '../../domain/value-objects/Title';
import { Content } from '../../domain/value-objects/Content';
import { Logger } from '../../infrastructure/logger/Logger';

/**
 * Use case for manually generating an article from a specific feed item
 * with custom prompts and settings
 */
export class GenerateArticleManually implements UseCase<ManualGenerateRequest, ManualGenerateResponse> {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly aiService: AiService,
    private readonly logger: Logger
  ) {}

  async execute(request: ManualGenerateRequest): Promise<Result<ManualGenerateResponse>> {
    try {
      this.logger.info('Starting manual article generation', {
        feedItemId: request.feedItem.id,
        sourceId: request.sourceId
      });

      // Prepare generation parameters
      const generationParams: GenerationParameters = {
        prompt: this.buildCustomPrompt(request.feedItem, request.customPrompts),
        model: request.settings.model || 'gpt-4',
        temperature: request.settings.temperature || 0.7,
        maxTokens: request.settings.maxTokens || 2000,
        language: request.settings.language || 'it',
        tone: request.settings.tone || 'professionale',
        style: request.settings.style || 'giornalistico',
        targetAudience: request.settings.targetAudience || 'generale'
      };

      // Generate content using AI service
      const generateResult = await this.aiService.generateArticle({
        sourceContent: request.feedItem.content,
        title: request.feedItem.title,
        url: request.feedItem.url,
        publishedAt: request.feedItem.publishedAt,
        parameters: generationParams
      });

      if (!generateResult.isSuccess()) {
        this.logger.error('AI service failed to generate article', {
          feedItemId: request.feedItem.id,
          error: generateResult.error
        });
        return Result.failure(`Generation failed: ${generateResult.error}`);
      }

      const generated = generateResult.value;

      // Create article entity
      const title = Title.create(generated.title);
      const content = Content.create(generated.content);

      if (!title.isSuccess() || !content.isSuccess()) {
        const errors = [
          title.isFailure() ? `Title: ${title.error}` : null,
          content.isFailure() ? `Content: ${content.error}` : null
        ].filter(Boolean);

        return Result.failure(`Failed to create article: ${errors.join(', ')}`);
      }

      // Create and save article
      const article = Article.createGenerated(
        title.value,
        content.value,
        request.sourceId,
        generationParams,
        generated.seoMetadata
      );

      await this.articleRepository.save(article);

      this.logger.info('Article generated manually successfully', {
        feedItemId: request.feedItem.id,
        articleId: article.id.getValue()
      });

      return Result.success({
        articleId: article.id.getValue(),
        article: {
          id: article.id.getValue(),
          title: article.title.getValue(),
          content: article.content.getValue(),
          status: article.status.getValue(),
          sourceId: request.sourceId,
          createdAt: article.createdAt,
          seoMetadata: article.seoMetadata
        }
      });

    } catch (error) {
      this.logger.error('Manual generation process failed', {
        feedItemId: request.feedItem.id,
        error
      });
      return Result.failure(`Manual generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildCustomPrompt(feedItem: FeedItemData, customPrompts: CustomPrompts): string {
    const titlePrompt = customPrompts.titlePrompt ||
      'Crea un titolo accattivante e SEO-friendly per questo articolo';

    const contentPrompt = customPrompts.contentPrompt ||
      'Scrivi un articolo completo e ben strutturato basato su questo contenuto';

    const seoPrompt = customPrompts.seoPrompt ||
      'Includi meta description, tags e parole chiave ottimizzate per i motori di ricerca';

    return `
ISTRUZIONI PERSONALIZZATE PER LA GENERAZIONE:

TITOLO:
${titlePrompt}

CONTENUTO PRINCIPALE:
${contentPrompt}

SEO E METADATA:
${seoPrompt}

CONTENUTO SORGENTE:
Titolo: ${feedItem.title}
Contenuto: ${feedItem.content}
URL originale: ${feedItem.url || 'N/A'}
Data pubblicazione: ${feedItem.publishedAt}

Genera un articolo completo, originale e ben strutturato seguendo esattamente le istruzioni fornite.
`;
  }
}

export interface ManualGenerateRequest {
  feedItem: FeedItemData;
  sourceId: string;
  customPrompts: CustomPrompts;
  settings: GenerationSettings;
}

export interface ManualGenerateResponse {
  articleId: string;
  article: {
    id: string;
    title: string;
    content: string;
    status: string;
    sourceId: string;
    createdAt: Date;
    seoMetadata?: any;
  };
}

export interface FeedItemData {
  id: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
}

export interface CustomPrompts {
  titlePrompt?: string;
  contentPrompt?: string;
  seoPrompt?: string;
}

export interface GenerationSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  tone?: string;
  style?: string;
  targetAudience?: string;
}