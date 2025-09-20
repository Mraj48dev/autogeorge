import { Result } from '../../shared/domain/types/Result';
import { Article } from '../entities/Article';
import { ArticleId } from '../value-objects/ArticleId';

/**
 * Repository port for Article aggregate.
 *
 * This interface defines the contract for persisting and retrieving articles.
 * It follows the Repository pattern from Domain-Driven Design, providing
 * a collection-like interface for accessing domain objects.
 *
 * Key principles:
 * - Abstract interface (port) defined in domain layer
 * - Concrete implementation (adapter) in infrastructure layer
 * - Returns domain objects, not data transfer objects
 * - Uses Result types for error handling
 * - Supports both single and bulk operations
 * - Includes search and filtering capabilities
 */
export interface ArticleRepository {
  /**
   * Saves a new article or updates an existing one.
   * This method handles both creation and updates transparently.
   *
   * @param article The article to save
   * @returns Result indicating success or failure with error details
   */
  save(article: Article): Promise<Result<void, RepositoryError>>;

  /**
   * Saves multiple articles in a single transaction.
   * Either all articles are saved or none are (atomic operation).
   *
   * @param articles Array of articles to save
   * @returns Result indicating success or failure with error details
   */
  saveMany(articles: Article[]): Promise<Result<void, RepositoryError>>;

  /**
   * Finds an article by its unique identifier.
   *
   * @param id The article ID to search for
   * @returns Result containing the article if found, or error if not found/failed
   */
  findById(id: ArticleId): Promise<Result<Article, RepositoryError>>;

  /**
   * Finds multiple articles by their identifiers.
   * Returns only the articles that exist; missing articles are not included in the result.
   *
   * @param ids Array of article IDs to search for
   * @returns Result containing array of found articles
   */
  findByIds(ids: ArticleId[]): Promise<Result<Article[], RepositoryError>>;

  /**
   * Finds articles based on filter criteria.
   * Supports pagination, sorting, and various filter options.
   *
   * @param criteria Filter and pagination criteria
   * @returns Result containing filtered articles and pagination info
   */
  findByCriteria(criteria: ArticleSearchCriteria): Promise<Result<ArticleSearchResult, RepositoryError>>;

  /**
   * Finds articles by their source ID.
   * Useful for retrieving all articles generated from a specific source.
   *
   * @param sourceId The source identifier
   * @param pagination Optional pagination parameters
   * @returns Result containing articles from the specified source
   */
  findBySourceId(
    sourceId: string,
    pagination?: PaginationOptions
  ): Promise<Result<Article[], RepositoryError>>;

  /**
   * Finds articles by their status.
   * Useful for processing workflows and monitoring.
   *
   * @param status The article status to filter by
   * @param pagination Optional pagination parameters
   * @returns Result containing articles with the specified status
   */
  findByStatus(
    status: string,
    pagination?: PaginationOptions
  ): Promise<Result<Article[], RepositoryError>>;

  /**
   * Checks if an article exists with the given ID.
   * More efficient than findById when you only need to check existence.
   *
   * @param id The article ID to check
   * @returns Result indicating whether the article exists
   */
  exists(id: ArticleId): Promise<Result<boolean, RepositoryError>>;

  /**
   * Deletes an article by its ID.
   * This is a soft delete in most implementations to maintain audit trails.
   *
   * @param id The article ID to delete
   * @returns Result indicating success or failure
   */
  delete(id: ArticleId): Promise<Result<void, RepositoryError>>;

  /**
   * Deletes multiple articles by their IDs.
   * This is an atomic operation - either all are deleted or none are.
   *
   * @param ids Array of article IDs to delete
   * @returns Result indicating success or failure
   */
  deleteMany(ids: ArticleId[]): Promise<Result<void, RepositoryError>>;

  /**
   * Counts the total number of articles matching the criteria.
   * Useful for pagination and reporting.
   *
   * @param criteria Optional filter criteria
   * @returns Result containing the count
   */
  count(criteria?: Partial<ArticleSearchCriteria>): Promise<Result<number, RepositoryError>>;

  /**
   * Gets articles that need to be published.
   * Returns articles with status 'ready_to_publish' or 'generated'.
   *
   * @param limit Maximum number of articles to return
   * @returns Result containing articles ready for publication
   */
  getArticlesReadyForPublication(limit?: number): Promise<Result<Article[], RepositoryError>>;

  /**
   * Gets recently published articles.
   * Useful for dashboards and monitoring.
   *
   * @param days Number of days to look back (default: 7)
   * @param limit Maximum number of articles to return
   * @returns Result containing recently published articles
   */
  getRecentlyPublished(days?: number, limit?: number): Promise<Result<Article[], RepositoryError>>;

  /**
   * Gets articles that failed processing.
   * Useful for error monitoring and retry mechanisms.
   *
   * @param limit Maximum number of articles to return
   * @returns Result containing failed articles
   */
  getFailedArticles(limit?: number): Promise<Result<Article[], RepositoryError>>;
}

/**
 * Search criteria for filtering articles
 */
export interface ArticleSearchCriteria {
  /** Filter by article status */
  status?: string[];

  /** Filter by source ID */
  sourceId?: string;

  /** Filter by user ID who created the article */
  userId?: string;

  /** Filter by creation date range */
  createdAfter?: Date;
  createdBefore?: Date;

  /** Filter by update date range */
  updatedAfter?: Date;
  updatedBefore?: Date;

  /** Filter by publication date range */
  publishedAfter?: Date;
  publishedBefore?: Date;

  /** Search in title and content */
  searchTerm?: string;

  /** Filter by word count range */
  minWordCount?: number;
  maxWordCount?: number;

  /** Include or exclude articles with SEO metadata */
  hasSeoMetadata?: boolean;

  /** Sorting options */
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';

  /** Pagination */
  page?: number;
  limit?: number;
}

/**
 * Search result with pagination information
 */
export interface ArticleSearchResult {
  /** The articles matching the criteria */
  articles: Article[];

  /** Pagination information */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  /** Applied filters for reference */
  appliedFilters: Partial<ArticleSearchCriteria>;
}

/**
 * Pagination options for repository methods
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Repository-specific error types
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }

  static notFound(id: string): RepositoryError {
    return new RepositoryError(
      `Article with ID ${id} not found`,
      'NOT_FOUND'
    );
  }

  static conflict(id: string): RepositoryError {
    return new RepositoryError(
      `Article with ID ${id} already exists or version conflict`,
      'CONFLICT'
    );
  }

  static connectionError(originalError: Error): RepositoryError {
    return new RepositoryError(
      'Database connection error',
      'CONNECTION_ERROR',
      originalError
    );
  }

  static validationError(message: string): RepositoryError {
    return new RepositoryError(
      `Validation error: ${message}`,
      'VALIDATION_ERROR'
    );
  }

  static unknown(originalError: Error): RepositoryError {
    return new RepositoryError(
      `Unknown repository error: ${originalError.message}`,
      'UNKNOWN_ERROR',
      originalError
    );
  }
}

export type RepositoryErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CONNECTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';