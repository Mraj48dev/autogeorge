import { Result } from '../../shared/domain/types/Result';

/**
 * Domain Port for FeedItem Repository
 * Following Clean Architecture - Domain Layer defines contracts
 */
export interface FeedItemRepository {
  /**
   * Saves a new feed item to storage
   */
  save(feedItem: FeedItemForSave): Promise<Result<SavedFeedItem, Error>>;

  /**
   * Finds existing feed item by source and GUID for deduplication
   */
  findBySourceAndGuid(sourceId: string, guid: string): Promise<Result<SavedFeedItem | null, Error>>;

  /**
   * Updates feed item status after article generation
   */
  updateStatus(feedItemId: string, status: FeedItemStatus, articleId?: string): Promise<Result<void, Error>>;

  /**
   * Gets feed items ready for processing (status = 'draft')
   */
  getReadyForProcessing(sourceId: string): Promise<Result<SavedFeedItem[], Error>>;
}

/**
 * Feed Item Status - 3-state system
 */
export type FeedItemStatus = 'pending' | 'draft' | 'processed';

/**
 * Domain Entity - Feed Item for saving
 */
export interface FeedItemForSave {
  sourceId: string;
  guid: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  fetchedAt: Date;
  status: FeedItemStatus; // New: Sources Module sets this based on auto-generation settings
}

/**
 * Domain Entity - Saved Feed Item
 */
export interface SavedFeedItem {
  id: string;
  sourceId: string;
  guid: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
  fetchedAt: Date;
  status: FeedItemStatus; // Changed from processed: boolean
  articleId?: string;
}