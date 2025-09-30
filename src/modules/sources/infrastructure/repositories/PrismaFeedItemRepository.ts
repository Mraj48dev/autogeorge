import { PrismaClient } from '@prisma/client';
import { Result } from '../../shared/domain/types/Result';
import {
  FeedItemRepository,
  FeedItemForSave,
  SavedFeedItem,
  FeedItemStatus
} from '../../domain/ports/FeedItemRepository';

/**
 * Infrastructure Adapter - Prisma implementation of FeedItemRepository
 * Following Clean Architecture - Infrastructure implements Domain Ports
 */
export class PrismaFeedItemRepository implements FeedItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(feedItem: FeedItemForSave): Promise<Result<SavedFeedItem, Error>> {
    try {
      // Sources Module sets status based on auto-generation settings
      const savedItem = await this.prisma.feedItem.create({
        data: {
          sourceId: feedItem.sourceId,
          guid: feedItem.guid,
          title: feedItem.title,
          content: feedItem.content,
          url: feedItem.url,
          publishedAt: feedItem.publishedAt,
          fetchedAt: feedItem.fetchedAt,
          status: feedItem.status, // New 3-state system
        }
      });

      console.log(`💾 Feed item saved with status "${feedItem.status}": ${savedItem.id} - ${savedItem.title}`);

      return Result.success({
        id: savedItem.id,
        sourceId: savedItem.sourceId,
        guid: savedItem.guid,
        title: savedItem.title,
        content: savedItem.content || '',
        url: savedItem.url || undefined,
        publishedAt: savedItem.publishedAt,
        fetchedAt: savedItem.fetchedAt,
        status: savedItem.status as FeedItemStatus,
        articleId: savedItem.articleId || undefined,
      });
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to save feed item')
      );
    }
  }

  async findBySourceAndGuid(sourceId: string, guid: string): Promise<Result<SavedFeedItem | null, Error>> {
    try {
      console.log(`✅ [INFO] Deduplication re-enabled - checking for existing item: ${sourceId}/${guid}`);

      const existingItem = await this.prisma.feedItem.findFirst({
        where: {
          sourceId,
          guid
        }
      });

      if (!existingItem) {
        return Result.success(null);
      }

      // Map Prisma result to SavedFeedItem domain object
      const savedItem: SavedFeedItem = {
        id: existingItem.id,
        sourceId: existingItem.sourceId,
        guid: existingItem.guid,
        title: existingItem.title,
        content: existingItem.content || '',
        url: existingItem.url || undefined,
        publishedAt: existingItem.publishedAt,
        fetchedAt: existingItem.fetchedAt,
        status: existingItem.status as FeedItemStatus,
        articleId: existingItem.articleId || undefined,
      };

      return Result.success(savedItem);
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to find feed item')
      );
    }
  }

  async updateStatus(feedItemId: string, status: FeedItemStatus, articleId?: string): Promise<Result<void, Error>> {
    try {
      await this.prisma.feedItem.update({
        where: { id: feedItemId },
        data: {
          status: status,
          articleId: articleId
        }
      });

      console.log(`🔄 Feed item ${feedItemId} status updated to: ${status}${articleId ? ` (article: ${articleId})` : ''}`);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to update feed item status')
      );
    }
  }

  async getReadyForProcessing(sourceId: string): Promise<Result<SavedFeedItem[], Error>> {
    try {
      const readyItems = await this.prisma.feedItem.findMany({
        where: {
          sourceId,
          status: 'draft' // Only items marked for processing
        },
        orderBy: {
          publishedAt: 'desc'
        }
      });

      const savedItems: SavedFeedItem[] = readyItems.map(item => ({
        id: item.id,
        sourceId: item.sourceId,
        guid: item.guid,
        title: item.title,
        content: item.content || '',
        url: item.url || undefined,
        publishedAt: item.publishedAt,
        fetchedAt: item.fetchedAt,
        status: item.status as FeedItemStatus,
        articleId: item.articleId || undefined,
      }));

      return Result.success(savedItems);
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to get items ready for processing')
      );
    }
  }
}