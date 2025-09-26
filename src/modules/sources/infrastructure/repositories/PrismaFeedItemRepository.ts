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
      // Salva il feed item
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

      // Controlla se la source ha autoGenerate = true per creare MonitorGeneration
      try {
        const source = await this.prisma.source.findUnique({
          where: { id: feedItem.sourceId },
          select: { configuration: true, name: true }
        });

        const shouldAutoGenerate = source?.configuration &&
          typeof source.configuration === 'object' &&
          (source.configuration as any)?.autoGenerate === true;

        if (shouldAutoGenerate) {
          console.log(`📋 Creating monitor generation record for: ${savedItem.title}`);

          await this.prisma.monitorGeneration.create({
            data: {
              feedItemId: savedItem.id,
              sourceId: feedItem.sourceId,
              sourceName: source?.name || 'Unknown Source',
              title: savedItem.title,
              content: savedItem.content || '',
              url: savedItem.url,
              publishedAt: savedItem.publishedAt,
              status: 'pending',
              priority: 'normal',
              metadata: {
                originalGuid: savedItem.guid,
                fetchedAt: savedItem.fetchedAt.toISOString(),
                autoCreated: true
              }
            }
          });

          console.log(`✅ Monitor generation record created for feed item: ${savedItem.id}`);
        } else {
          console.log(`⚪ Skipping monitor creation - autoGenerate not enabled for source: ${source?.name || feedItem.sourceId}`);
        }
      } catch (monitorError) {
        // Non fallire il salvataggio del feed item se la creazione del monitor fallisce
        console.error('⚠️ Failed to create monitor generation record:', monitorError);
        // Continue con il successo del feed item
      }

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
        processed: existingItem.processed,
        articleId: existingItem.articleId || undefined,
      };

      return Result.success(savedItem);
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