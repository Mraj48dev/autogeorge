import { Result } from '../../../../shared/domain/types/Result';
import { Publication } from '../entities/Publication';
import { PublicationId } from '../value-objects/PublicationId';
import { PublicationStatus } from '../value-objects/PublicationStatus';

/**
 * Repository interface for Publication aggregate.
 *
 * Defines the contract for persisting and retrieving publications.
 * Implementations should handle database operations, caching,
 * and ensure data consistency.
 */
export interface PublicationRepository {
  /**
   * Saves a publication to the repository
   */
  save(publication: Publication): Promise<Result<void, RepositoryError>>;

  /**
   * Finds a publication by its ID
   */
  findById(id: PublicationId): Promise<Result<Publication | null, RepositoryError>>;

  /**
   * Finds publications by article ID
   */
  findByArticleId(articleId: string): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Finds publications by status
   */
  findByStatus(status: PublicationStatus): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Finds publications ready for execution
   */
  findReadyForExecution(): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Finds publications by target platform
   */
  findByPlatform(platform: string): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Finds publications created within a date range
   */
  findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Finds failed publications that can be retried
   */
  findRetryable(): Promise<Result<Publication[], RepositoryError>>;

  /**
   * Deletes a publication by its ID
   */
  delete(id: PublicationId): Promise<Result<void, RepositoryError>>;

  /**
   * Checks if a publication exists for the given article and target
   */
  existsForArticleAndTarget(
    articleId: string,
    platform: string,
    siteId: string
  ): Promise<Result<boolean, RepositoryError>>;

  /**
   * Gets publication statistics
   */
  getStatistics(): Promise<Result<PublicationStatistics, RepositoryError>>;
}

/**
 * Repository error types
 */
export interface RepositoryError {
  code: RepositoryErrorCode;
  message: string;
  details?: Record<string, any>;
}

export type RepositoryErrorCode =
  | 'DATABASE_ERROR'
  | 'CONNECTION_ERROR'
  | 'CONSTRAINT_VIOLATION'
  | 'NOT_FOUND'
  | 'SERIALIZATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Publication statistics
 */
export interface PublicationStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  successRate: number;
  averageDuration: number;
  totalRetries: number;
  last24Hours: {
    total: number;
    successful: number;
    failed: number;
  };
}