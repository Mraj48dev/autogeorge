import { PrismaClient, Article as PrismaArticle, Prisma } from '@prisma/client';
import { Result } from '../../shared/domain/types/Result';
import { ArticleRepository, ArticleSearchCriteria, ArticleSearchResult, PaginationOptions, RepositoryError } from '../../domain/ports/ArticleRepository';
import { Article, GenerationParameters } from '../../domain/entities/Article';
import { ArticleId } from '../../domain/value-objects/ArticleId';
import { Title } from '../../domain/value-objects/Title';
import { Content } from '../../domain/value-objects/Content';
import { ArticleStatus } from '../../domain/value-objects/ArticleStatus';

/**
 * Prisma implementation of the ArticleRepository port.
 *
 * This adapter translates between domain entities and Prisma data models,
 * handling the impedance mismatch between the rich domain model and
 * the relational database structure.
 *
 * Key responsibilities:
 * - Mapping domain entities to/from Prisma models
 * - Translating domain queries to SQL queries
 * - Error handling and conversion to domain errors
 * - Transaction management for consistency
 * - Performance optimization with proper indexing
 */
export class PrismaArticleRepository implements ArticleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(article: Article): Promise<Result<void, RepositoryError>> {
    try {
      const data = this.toPrismaModel(article);

      // Use upsert to handle both creates and updates
      await this.prisma.article.upsert({
        where: { id: article.id.getValue() },
        create: data,
        update: {
          ...data,
          // Don't update id and createdAt on updates
          id: undefined,
          createdAt: undefined,
        },
      });

      return Result.success(undefined);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async saveMany(articles: Article[]): Promise<Result<void, RepositoryError>> {
    try {
      // Use transaction to ensure atomicity
      await this.prisma.$transaction(async (tx) => {
        for (const article of articles) {
          const data = this.toPrismaModel(article);
          await tx.article.upsert({
            where: { id: article.id.getValue() },
            create: data,
            update: {
              ...data,
              id: undefined,
              createdAt: undefined,
            },
          });
        }
      });

      return Result.success(undefined);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async findById(id: ArticleId): Promise<Result<Article, RepositoryError>> {
    try {
      const prismaArticle = await this.prisma.article.findUnique({
        where: { id: id.getValue() },
      });

      if (!prismaArticle) {
        return Result.failure(RepositoryError.notFound(id.getValue()));
      }

      const article = this.toDomainEntity(prismaArticle);
      return Result.success(article);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async findByIds(ids: ArticleId[]): Promise<Result<Article[], RepositoryError>> {
    try {
      const idStrings = ids.map(id => id.getValue());
      const prismaArticles = await this.prisma.article.findMany({
        where: { id: { in: idStrings } },
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async findByCriteria(criteria: ArticleSearchCriteria): Promise<Result<ArticleSearchResult, RepositoryError>> {
    try {
      const where = this.buildWhereClause(criteria);
      const orderBy = this.buildOrderByClause(criteria);

      const page = criteria.page || 1;
      const limit = criteria.limit || 20;
      const skip = (page - 1) * limit;

      // Execute both queries in parallel
      const [prismaArticles, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.article.count({ where }),
      ]);

      const articles = prismaArticles.map(this.toDomainEntity);
      const totalPages = Math.ceil(total / limit);

      const result: ArticleSearchResult = {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        appliedFilters: criteria,
      };

      return Result.success(result);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async findBySourceId(
    sourceId: string,
    pagination?: PaginationOptions
  ): Promise<Result<Article[], RepositoryError>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      const prismaArticles = await this.prisma.article.findMany({
        where: { sourceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async findByStatus(
    status: string,
    pagination?: PaginationOptions
  ): Promise<Result<Article[], RepositoryError>> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const skip = (page - 1) * limit;

      const prismaArticles = await this.prisma.article.findMany({
        where: { status },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async exists(id: ArticleId): Promise<Result<boolean, RepositoryError>> {
    try {
      const count = await this.prisma.article.count({
        where: { id: id.getValue() },
      });

      return Result.success(count > 0);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async delete(id: ArticleId): Promise<Result<void, RepositoryError>> {
    try {
      await this.prisma.article.delete({
        where: { id: id.getValue() },
      });

      return Result.success(undefined);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return Result.failure(RepositoryError.notFound(id.getValue()));
      }
      return this.handlePrismaError(error);
    }
  }

  async deleteMany(ids: ArticleId[]): Promise<Result<void, RepositoryError>> {
    try {
      const idStrings = ids.map(id => id.getValue());
      await this.prisma.article.deleteMany({
        where: { id: { in: idStrings } },
      });

      return Result.success(undefined);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async count(criteria?: Partial<ArticleSearchCriteria>): Promise<Result<number, RepositoryError>> {
    try {
      const where = criteria ? this.buildWhereClause(criteria) : {};
      const count = await this.prisma.article.count({ where });
      return Result.success(count);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async getArticlesReadyForPublication(limit = 50): Promise<Result<Article[], RepositoryError>> {
    try {
      const prismaArticles = await this.prisma.article.findMany({
        where: {
          status: {
            in: ['ready_to_publish', 'generated'],
          },
        },
        orderBy: { updatedAt: 'asc' }, // Oldest first for FIFO processing
        take: limit,
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async getRecentlyPublished(days = 7, limit = 50): Promise<Result<Article[], RepositoryError>> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const prismaArticles = await this.prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: {
            gte: since,
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  async getFailedArticles(limit = 50): Promise<Result<Article[], RepositoryError>> {
    try {
      const prismaArticles = await this.prisma.article.findMany({
        where: { status: 'failed' },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      const articles = prismaArticles.map(this.toDomainEntity);
      return Result.success(articles);
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  /**
   * Converts a domain Article entity to a Prisma model
   */
  private toPrismaModel(article: Article): Prisma.ArticleUncheckedCreateInput {
    return {
      id: article.id.getValue(),
      title: article.title.getValue(),
      content: article.content.getValue(),
      status: article.status.getValue(),
      sourceId: article.sourceId,
      generationParams: article.generationParams as Prisma.JsonValue,
      seoMetadata: article.seoMetadata?.toJSON() as Prisma.JsonValue,
      publishedAt: article.publishedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  /**
   * Converts a Prisma model to a domain Article entity
   */
  private toDomainEntity = (prismaArticle: PrismaArticle): Article => {
    const id = ArticleId.fromString(prismaArticle.id);
    const title = new Title(prismaArticle.title);
    const content = new Content(prismaArticle.content);
    const status = ArticleStatus.fromString(prismaArticle.status);

    return new Article(
      id,
      title,
      content,
      status,
      undefined, // seoMetadata - would need to reconstruct from JSON
      prismaArticle.sourceId || undefined,
      prismaArticle.generationParams as GenerationParameters || undefined,
      prismaArticle.createdAt,
      prismaArticle.updatedAt
    );
  };

  /**
   * Builds Prisma where clause from search criteria
   */
  private buildWhereClause(criteria: Partial<ArticleSearchCriteria>): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = {};

    if (criteria.status && criteria.status.length > 0) {
      where.status = { in: criteria.status };
    }

    if (criteria.sourceId) {
      where.sourceId = criteria.sourceId;
    }

    if (criteria.userId) {
      where.userId = criteria.userId;
    }

    if (criteria.createdAfter || criteria.createdBefore) {
      where.createdAt = {};
      if (criteria.createdAfter) {
        where.createdAt.gte = criteria.createdAfter;
      }
      if (criteria.createdBefore) {
        where.createdAt.lte = criteria.createdBefore;
      }
    }

    if (criteria.updatedAfter || criteria.updatedBefore) {
      where.updatedAt = {};
      if (criteria.updatedAfter) {
        where.updatedAt.gte = criteria.updatedAfter;
      }
      if (criteria.updatedBefore) {
        where.updatedAt.lte = criteria.updatedBefore;
      }
    }

    if (criteria.publishedAfter || criteria.publishedBefore) {
      where.publishedAt = {};
      if (criteria.publishedAfter) {
        where.publishedAt.gte = criteria.publishedAfter;
      }
      if (criteria.publishedBefore) {
        where.publishedAt.lte = criteria.publishedBefore;
      }
    }

    if (criteria.searchTerm) {
      where.OR = [
        { title: { contains: criteria.searchTerm, mode: 'insensitive' } },
        { content: { contains: criteria.searchTerm, mode: 'insensitive' } },
      ];
    }

    if (criteria.hasSeoMetadata !== undefined) {
      if (criteria.hasSeoMetadata) {
        where.seoMetadata = { not: Prisma.JsonNull };
      } else {
        where.seoMetadata = Prisma.JsonNull;
      }
    }

    return where;
  }

  /**
   * Builds Prisma orderBy clause from search criteria
   */
  private buildOrderByClause(criteria: ArticleSearchCriteria): Prisma.ArticleOrderByWithRelationInput {
    const sortBy = criteria.sortBy || 'updatedAt';
    const sortOrder = criteria.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }

  /**
   * Handles Prisma errors and converts them to domain repository errors
   */
  private handlePrismaError<T>(error: any): Result<T, RepositoryError> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return Result.failure(RepositoryError.conflict('Unique constraint violation'));
        case 'P2025':
          return Result.failure(RepositoryError.notFound('Record not found'));
        case 'P1001':
          return Result.failure(RepositoryError.connectionError(error));
        case 'P2003':
          return Result.failure(RepositoryError.validationError('Foreign key constraint failed'));
        default:
          return Result.failure(RepositoryError.unknown(error));
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return Result.failure(RepositoryError.validationError(error.message));
    }

    return Result.failure(RepositoryError.unknown(error));
  }
}