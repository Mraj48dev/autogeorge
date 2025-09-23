import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { ArticleSummary } from '../../domain/entities/Article';
import { Logger } from '../../infrastructure/logger/Logger';

/**
 * Use case for retrieving articles grouped by source
 */
export class GetArticlesBySource implements UseCase<GetArticlesBySourceRequest, GetArticlesBySourceResponse> {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly logger: Logger
  ) {}

  async execute(request: GetArticlesBySourceRequest): Promise<Result<GetArticlesBySourceResponse>> {
    try {
      this.logger.info('Retrieving articles by source', {
        filters: request.filters
      });

      // Get articles with filters
      const articles = await this.articleRepository.findByFilters({
        status: request.filters?.status,
        sourceId: request.filters?.sourceId,
        dateFrom: request.filters?.dateFrom,
        dateTo: request.filters?.dateTo,
        limit: request.pagination?.limit,
        offset: request.pagination?.offset
      });

      // Group articles by source
      const groupedBySource = this.groupArticlesBySource(articles);

      // Get total count for pagination
      const totalCount = await this.articleRepository.countByFilters({
        status: request.filters?.status,
        sourceId: request.filters?.sourceId,
        dateFrom: request.filters?.dateFrom,
        dateTo: request.filters?.dateTo
      });

      this.logger.info('Articles retrieved successfully', {
        articlesCount: articles.length,
        sourcesCount: Object.keys(groupedBySource).length,
        totalCount
      });

      return Result.success({
        articlesBySource: groupedBySource,
        pagination: {
          total: totalCount,
          limit: request.pagination?.limit || 20,
          offset: request.pagination?.offset || 0,
          hasMore: (request.pagination?.offset || 0) + articles.length < totalCount
        },
        summary: this.generateSummary(groupedBySource)
      });

    } catch (error) {
      this.logger.error('Failed to retrieve articles by source', { error });
      return Result.failure(`Failed to retrieve articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private groupArticlesBySource(articles: ArticleSummary[]): Record<string, SourceArticleGroup> {
    const grouped: Record<string, SourceArticleGroup> = {};

    articles.forEach(article => {
      const sourceId = article.sourceId || 'unknown';

      if (!grouped[sourceId]) {
        grouped[sourceId] = {
          sourceId,
          sourceName: article.sourceName || 'Fonte sconosciuta',
          articles: [],
          totalCount: 0,
          statusCounts: {
            draft: 0,
            generated: 0,
            ready_to_publish: 0,
            published: 0,
            failed: 0
          }
        };
      }

      grouped[sourceId].articles.push(article);
      grouped[sourceId].totalCount++;

      // Update status counts
      const statusCounts = grouped[sourceId].statusCounts;
      const status = article.status;
      if (status in statusCounts) {
        (statusCounts as any)[status]++;
      }
    });

    // Sort articles within each source by creation date (newest first)
    Object.values(grouped).forEach(group => {
      group.articles.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return grouped;
  }

  private generateSummary(groupedBySource: Record<string, SourceArticleGroup>): ArticlesSummary {
    const sources = Object.values(groupedBySource);

    const totalArticles = sources.reduce((sum, source) => sum + source.totalCount, 0);
    const totalSources = sources.length;

    const statusCounts = sources.reduce((acc, source) => {
      Object.entries(source.statusCounts).forEach(([status, count]) => {
        acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + count;
      });
      return acc;
    }, {
      draft: 0,
      generated: 0,
      ready_to_publish: 0,
      published: 0,
      failed: 0
    });

    return {
      totalArticles,
      totalSources,
      statusCounts,
      mostActiveSource: sources.length > 0
        ? sources.reduce((max, source) =>
            source.totalCount > max.totalCount ? source : max
          ).sourceName
        : null
    };
  }
}

export interface GetArticlesBySourceRequest {
  filters?: {
    status?: string;
    sourceId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
  pagination?: {
    limit?: number;
    offset?: number;
  };
}

export interface GetArticlesBySourceResponse {
  articlesBySource: Record<string, SourceArticleGroup>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: ArticlesSummary;
}

export interface SourceArticleGroup {
  sourceId: string;
  sourceName: string;
  articles: ArticleSummary[];
  totalCount: number;
  statusCounts: {
    draft: number;
    generated: number;
    ready_to_publish: number;
    published: number;
    failed: number;
  };
}

export interface ArticlesSummary {
  totalArticles: number;
  totalSources: number;
  statusCounts: {
    draft: number;
    generated: number;
    ready_to_publish: number;
    published: number;
    failed: number;
  };
  mostActiveSource: string | null;
}

// Extend ArticleSummary to include source information
declare module '../../domain/entities/Article' {
  interface ArticleSummary {
    sourceId?: string;
    sourceName?: string;
  }
}