import { Result } from '../../shared/domain/types/Result';
import { Source } from '../entities/Source';

/**
 * Service interface for fetching content from sources
 * Abstracts the actual fetching implementation
 */
export interface SourceFetchService {
  /**
   * Fetches content from a source
   */
  fetchContent(source: Source): Promise<Result<FetchResult, FetchError>>;

  /**
   * Tests if a source is reachable and valid
   */
  testSource(source: Source): Promise<Result<SourceTestResult, FetchError>>;

  /**
   * Gets the health status of the fetch service
   */
  getServiceHealth(): Promise<Result<ServiceHealth, Error>>;

  /**
   * Validates a source configuration before saving
   */
  validateSourceConfig(source: Source): Promise<Result<ValidationResult, Error>>;
}

// Fetch result interface
export interface FetchResult {
  sourceId: string;
  fetchedItems: FetchedItem[];
  newItems: FetchedItem[];
  metadata: FetchMetadata;
  duration: number;
}

// Individual fetched item
export interface FetchedItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  publishedAt?: Date;
  url?: string;
  author?: string;
  categories?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

// Fetch metadata
export interface FetchMetadata {
  fetchedAt: Date;
  totalFound: number;
  newItemsCount: number;
  duplicatesSkipped: number;
  errors: string[];
  sourceMetadata?: Record<string, any>;
}

// Source test result
export interface SourceTestResult {
  isReachable: boolean;
  isValid: boolean;
  responseTime: number;
  sampleItems?: FetchedItem[];
  metadata?: Record<string, any>;
  warnings?: string[];
}

// Service health
export interface ServiceHealth {
  isHealthy: boolean;
  services: {
    rss: ServiceStatus;
    telegram: ServiceStatus;
    calendar: ServiceStatus;
  };
  lastCheck: Date;
}

export interface ServiceStatus {
  isAvailable: boolean;
  responseTime?: number;
  error?: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Fetch error types
export class FetchError extends Error {
  constructor(
    message: string,
    public readonly type: FetchErrorType,
    public readonly code?: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export type FetchErrorType =
  | 'network'      // Network connectivity issues
  | 'auth'         // Authentication/authorization failures
  | 'parse'        // Content parsing errors
  | 'validation'   // Data validation errors
  | 'rate_limit'   // Rate limiting
  | 'not_found'    // Resource not found
  | 'timeout'      // Request timeout
  | 'server'       // Server errors (5xx)
  | 'client'       // Client errors (4xx)
  | 'unknown';     // Unknown errors