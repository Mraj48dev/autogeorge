import { PrismaClient } from '@prisma/client';
import { Result } from '../../shared/domain/types/Result';
import {
  FeedItemRepository,
  FeedItemForSave,
  SavedFeedItem
} from '../../domain/ports/FeedItemRepository';

/**
 * Infrastructure Adapter - Prisma implementation of FeedItemRepository
 * Following Clean Architecture - Infrastructure implements Domain Ports
 */
export class PrismaFeedItemRepository implements FeedItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(feedItem: FeedItemForSave): Promise<Result<SavedFeedItem, Error>> {
    try {
      const savedItem = await this.prisma.feedItem.create({
        data: {
          sourceId: feedItem.sourceId,
          guid: feedItem.guid,
          title: feedItem.title,
          content: feedItem.content,
          url: feedItem.url,
          publishedAt: feedItem.publishedAt,
          fetchedAt: feedItem.fetchedAt,
          processed: false,
        }
      });

      return Result.success({
        id: savedItem.id,
        sourceId: savedItem.sourceId,
        guid: savedItem.guid,
        title: savedItem.title,
        content: savedItem.content || '',
        url: savedItem.url || undefined,
        publishedAt: savedItem.publishedAt,
        fetchedAt: savedItem.fetchedAt,
        processed: savedItem.processed,
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
      const existingItem = await this.prisma.feedItem.findFirst({
        where: {
          sourceId,
          guid
        }
      });

      if (!existingItem) {
        return Result.success(null);
      }

      return Result.success({
        id: existingItem.id,
        sourceId: existingItem.sourceId,
        guid: existingItem.guid,
        title: existingItem.title,
        content: existingItem.content || '',
        url: existingItem.url || undefined,
        publishedAt: existingItem.publishedAt,
        fetchedAt: existingItem.fetchedAt,
        processed: existingItem.processed,
        articleId: existingItem.articleId || undefined,
      });
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to find feed item')
      );
    }
  }

  async markAsProcessed(feedItemId: string, articleId?: string): Promise<Result<void, Error>> {
    try {
      await this.prisma.feedItem.update({
        where: { id: feedItemId },
        data: {
          processed: true,
          articleId: articleId
        }
      });

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to mark feed item as processed')
      );
    }
  }

  async getUnprocessedForSource(sourceId: string): Promise<Result<SavedFeedItem[], Error>> {
    try {
      const unprocessedItems = await this.prisma.feedItem.findMany({
        where: {
          sourceId,
          processed: false
        },
        orderBy: {
          publishedAt: 'desc'
        }
      });

      const savedItems: SavedFeedItem[] = unprocessedItems.map(item => ({
        id: item.id,
        sourceId: item.sourceId,
        guid: item.guid,
        title: item.title,
        content: item.content || '',
        url: item.url || undefined,
        publishedAt: item.publishedAt,
        fetchedAt: item.fetchedAt,
        processed: item.processed,
        articleId: item.articleId || undefined,
      }));

      return Result.success(savedItems);
    } catch (error) {
      return Result.failure(
        error instanceof Error ? error : new Error('Failed to get unprocessed feed items')
      );
    }
  }
}