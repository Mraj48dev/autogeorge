import { Result } from '../../shared/domain/types/Result';
import { Source, SourceSummary } from '../entities/Source';
import { SourceId } from '../value-objects/SourceId';
import { SourceType } from '../value-objects/SourceType';
import { SourceStatus } from '../value-objects/SourceStatus';

/**
 * Repository interface for Source aggregate
 * Defines all persistence operations for sources
 */
export interface SourceRepository {
  /**
   * Saves a source (create or update)
   */
  save(source: Source): Promise<Result<Source, Error>>;

  /**
   * Finds a source by its ID
   */
  findById(id: SourceId): Promise<Result<Source | null, Error>>;

  /**
   * Finds sources by type
   */
  findByType(type: SourceType): Promise<Result<Source[], Error>>;

  /**
   * Finds sources by status
   */
  findByStatus(status: SourceStatus): Promise<Result<Source[], Error>>;

  /**
   * Finds all active sources ready for fetching
   */
  findActiveForFetching(): Promise<Result<Source[], Error>>;

  /**
   * Finds sources that need attention (errors, not fetched recently)
   */
  findNeedingAttention(): Promise<Result<Source[], Error>>;

  /**
   * Gets all sources with pagination
   */
  findAll(options?: FindSourcesOptions): Promise<Result<SourcePage, Error>>;

  /**
   * Gets source summaries for list views
   */
  findSummaries(options?: FindSourcesOptions): Promise<Result<SourceSummaryPage, Error>>;

  /**
   * Searches sources by name or URL
   */
  search(query: string, options?: FindSourcesOptions): Promise<Result<Source[], Error>>;

  /**
   * Checks if a source with the same type and URL already exists
   */
  existsByTypeAndUrl(type: SourceType, url: string): Promise<Result<boolean, Error>>;

  /**
   * Deletes a source by ID
   */
  delete(id: SourceId): Promise<Result<void, Error>>;

  /**
   * Updates the last fetch time for a source
   */
  updateLastFetch(id: SourceId, fetchTime: Date): Promise<Result<void, Error>>;

  /**
   * Bulk updates source statuses
   */
  bulkUpdateStatus(ids: SourceId[], status: SourceStatus): Promise<Result<number, Error>>;

  /**
   * Gets source statistics
   */
  getStatistics(): Promise<Result<SourceStatistics, Error>>;
}

// Options for finding sources
export interface FindSourcesOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'status' | 'createdAt' | 'lastFetchAt';
  sortOrder?: 'asc' | 'desc';
  type?: SourceType;
  status?: SourceStatus;
}

// Paginated results
export interface SourcePage {
  sources: Source[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SourceSummaryPage {
  sources: SourceSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics
export interface SourceStatistics {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalFetches: number;
  totalItems: number;
  totalErrors: number;
  lastFetchAt?: Date;
}