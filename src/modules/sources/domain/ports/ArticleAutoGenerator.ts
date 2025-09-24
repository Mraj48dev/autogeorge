import { Result } from '../../../shared/domain/types/Result';

/**
 * Port for auto-generating articles from feed items
 * This allows the sources module to trigger article generation
 * without direct dependency on the content module
 */
export interface ArticleAutoGenerator {
  /**
   * Automatically generate articles for new feed items
   */
  generateFromFeedItems(request: AutoGenerateFromFeedItemsRequest): Promise<Result<AutoGenerateFromFeedItemsResponse, Error>>;
}

export interface AutoGenerateFromFeedItemsRequest {
  sourceId: string;
  feedItems: FeedItemForGeneration[];
  generationSettings?: GenerationSettings;
}

export interface AutoGenerateFromFeedItemsResponse {
  generatedArticles: GeneratedArticleResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface FeedItemForGeneration {
  id: string;
  guid?: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
}

export interface GeneratedArticleResult {
  feedItemId: string;
  articleId?: string;
  success: boolean;
  error?: string;
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