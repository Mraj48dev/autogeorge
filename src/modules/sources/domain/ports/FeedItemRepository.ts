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
   * Updates feed item as processed after article generation
   */
  markAsProcessed(feedItemId: string, articleId?: string): Promise<Result<void, Error>>;

  /**
   * Gets unprocessed feed items for auto-generation
   */
  getUnprocessedForSource(sourceId: string): Promise<Result<SavedFeedItem[], Error>>;
}

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
  processed: boolean;
  articleId?: string;
}