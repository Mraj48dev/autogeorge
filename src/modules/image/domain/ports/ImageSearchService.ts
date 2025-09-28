import { Result } from '../../../shared/domain/types/Result';

export interface ImageSearchQuery {
  prompt: string;
  maxResults?: number;
  imageType?: 'photo' | 'illustration' | 'vector' | 'any';
  size?: 'small' | 'medium' | 'large' | 'any';
  safeSearch?: boolean;
  copyrightFilter?: 'free' | 'royalty-free' | 'any';
}

export interface ImageSearchResult {
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  source?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  format?: string;
  copyrightStatus?: 'free' | 'royalty-free' | 'copyrighted' | 'unknown';
  license?: string;
}

export interface ImageSearchResponse {
  results: ImageSearchResult[];
  totalResults: number;
  searchQuery: string;
  processingTime: number;
  provider: string;
}

export interface ImageSearchError {
  code: 'SEARCH_FAILED' | 'NO_RESULTS' | 'INVALID_QUERY' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE';
  message: string;
  details?: any;
}

/**
 * Port for Image Search Service
 *
 * Defines the contract for searching images from various sources
 * (free image repositories, AI generation services, etc.)
 */
export interface ImageSearchService {
  /**
   * Search for images based on AI prompt
   */
  searchImages(query: ImageSearchQuery): Promise<Result<ImageSearchResponse, ImageSearchError>>;

  /**
   * Generate an image using AI if no suitable free image is found
   */
  generateImage(prompt: string, style?: string): Promise<Result<ImageSearchResult, ImageSearchError>>;

  /**
   * Get service health status
   */
  getServiceHealth(): Promise<Result<{ isHealthy: boolean; provider: string; responseTime: number }, Error>>;

  /**
   * Get usage statistics
   */
  getUsageStats(): Promise<Result<{ dailySearches: number; dailyGenerations: number; remainingQuota: number }, Error>>;
}