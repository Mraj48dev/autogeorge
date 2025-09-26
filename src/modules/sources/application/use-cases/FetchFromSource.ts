import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository } from '../../domain/ports/SourceRepository';
import { FeedItemRepository, FeedItemForSave, SavedFeedItem } from '../../domain/ports/FeedItemRepository';
import { SourceFetchService, FetchResult, FetchedItem } from '../../domain/ports/SourceFetchService';
import { EventBus } from '../../../automation/shared/domain/base/DomainEvent';
import { NewFeedItemsDetectedEvent } from '../../domain/events/NewFeedItemsDetectedEvent';
import { SourceId } from '../../domain/value-objects/SourceId';

/**
 * Use case for fetching content from a specific source
 * Orchestrates the fetch process and updates source metadata
 */
export class FetchFromSource extends BaseUseCase<FetchFromSourceRequest, FetchFromSourceResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly feedItemRepository: FeedItemRepository,
    private readonly sourceFetchService: SourceFetchService,
    private readonly eventBus: EventBus
  ) {
    super();
  }

  async execute(request: FetchFromSourceRequest): Promise<Result<FetchFromSourceResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Get source
      const sourceId = SourceId.fromString(request.sourceId);
      const sourceResult = await this.sourceRepository.findById(sourceId);
      if (sourceResult.isFailure()) {
        return Result.failure(sourceResult.error);
      }

      const source = sourceResult.value;
      if (!source) {
        return Result.failure(new Error('Source not found'));
      }

      // Check if source is ready for fetching
      if (!source.isReadyForFetch()) {
        return Result.failure(new Error(`Source is not ready for fetching (status: ${source.status.getValue()})`));
      }

      const startTime = Date.now();

      try {
        // Fetch content from source
        const fetchResult = await this.sourceFetchService.fetchContent(source);
        if (fetchResult.isFailure()) {
          // Record error in source
          source.recordError(
            fetchResult.error.type,
            fetchResult.error.message,
            fetchResult.error.code,
            fetchResult.error.metadata
          );

          // Save updated source
          await this.sourceRepository.save(source);

          return Result.failure(new Error(`Fetch failed: ${fetchResult.error.message}`));
        }

        const duration = Date.now() - startTime;
        const result = fetchResult.value;

        // Save feed items to database using Repository pattern
        const savedFeedItems = await this.saveFeedItemsUsingRepository(result.newItems, request.sourceId);

        // Record successful fetch
        source.recordSuccessfulFetch(
          result.fetchedItems.length,
          savedFeedItems.length,
          duration,
          result.metadata
        );

        // Save updated source
        const saveResult = await this.sourceRepository.save(source);
        if (saveResult.isFailure()) {
          return Result.failure(saveResult.error);
        }

        // Publish event for new feed items if any were saved
        if (savedFeedItems.length > 0) {
          console.log(`📢 Publishing NewFeedItemsDetectedEvent for ${source.name.getValue()}: ${savedFeedItems.length} new items`);

          try {
            const event = NewFeedItemsDetectedEvent.create(
              request.sourceId,
              source.name.getValue(),
              source.type.getValue(),
              {
                enabled: source.configuration?.enabled ?? true,
                autoGenerate: source.configuration?.autoGenerate ?? false,
                pollingInterval: source.configuration?.pollingInterval,
                ...source.configuration
              },
              savedFeedItems.map(item => ({
                id: item.id,
                guid: item.guid,
                title: item.title,
                content: item.content,
                url: item.url,
                publishedAt: item.publishedAt.toISOString(),
                fetchedAt: new Date().toISOString()
              }))
            );

            await this.eventBus.publish(event);
            console.log(`✅ Event published successfully for ${source.name.getValue()}`);
          } catch (error) {
            console.error(`💥 Failed to publish event for ${source.name.getValue()}:`, error);
            // Don't fail the entire operation if event publishing fails
          }
        }

        return Result.success({
          sourceId: source.id.getValue(),
          fetchedItems: result.fetchedItems.length,
          newItems: savedFeedItems.length,
          duration,
          items: savedFeedItems,
          metadata: result.metadata,
          message: `Successfully fetched ${savedFeedItems.length} new items from ${result.fetchedItems.length} total items${savedFeedItems.length > 0 ? ', event published for automation' : ''}`
        });

      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error in source
        source.recordError(
          'unknown',
          error instanceof Error ? error.message : 'Unknown error occurred',
          undefined,
          { duration }
        );

        // Save updated source
        await this.sourceRepository.save(source);

        return Result.failure(this.handleError(error, 'Fetch operation failed'));
      }

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to execute fetch operation'));
    }
  }

  private validateRequest(request: FetchFromSourceRequest): Result<void, Error> {
    const baseValidation = super.validateRequest(request);
    if (baseValidation.isFailure()) {
      return baseValidation;
    }

    if (!request.sourceId || request.sourceId.trim().length === 0) {
      return Result.failure(new Error('Source ID is required'));
    }

    return Result.success(undefined);
  }

  /**
   * Saves fetched items using Clean Architecture Repository pattern
   * Respects Domain Layer separation and Ports & Adapters
   */
  private async saveFeedItemsUsingRepository(fetchedItems: FetchedItem[], sourceId: string): Promise<SavedFeedItem[]> {
    const savedFeedItems: SavedFeedItem[] = [];

    console.log(`🏗️ [Clean Architecture] Processing ${fetchedItems.length} fetched items for sourceId: ${sourceId}`);

    for (const item of fetchedItems) {
      try {
        const itemGuid = item.id || item.metadata?.guid || `${sourceId}-${Date.now()}`;
        console.log(`🔍 Processing item: ${item.title} | guid: ${itemGuid}`);

        // Check for duplicates using Repository pattern
        const existingResult = await this.feedItemRepository.findBySourceAndGuid(sourceId, itemGuid);

        if (existingResult.isFailure()) {
          console.error(`❌ Error checking for existing item: ${existingResult.error.message}`);
          continue;
        }

        const existingItem = existingResult.value;

        if (!existingItem) {
          // Create new FeedItem using Domain entities
          const feedItemForSave: FeedItemForSave = {
            sourceId,
            guid: itemGuid,
            title: item.title || 'Untitled',
            content: item.content || '',
            url: item.url,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            fetchedAt: new Date(),
          };

          console.log(`✅ Creating new feed item: ${feedItemForSave.title}`);

          // Save using Repository pattern
          const saveResult = await this.feedItemRepository.save(feedItemForSave);

          if (saveResult.isSuccess()) {
            savedFeedItems.push(saveResult.value);
            console.log(`🎉 Successfully saved feed item: ${saveResult.value.id}`);
          } else {
            console.error(`❌ Failed to save feed item "${item.title}":`, saveResult.error.message);
          }
        } else {
          console.log(`⚠️ Duplicate content skipped: ${item.title} (existing: ${existingItem.id})`);
        }
      } catch (error) {
        console.error(`💥 Unexpected error processing item "${item.title}":`, error);
        // Continue with other items
      }
    }

    console.log(`🏗️ [Clean Architecture] Saved ${savedFeedItems.length} feed items out of ${fetchedItems.length} fetched`);

    return savedFeedItems;
  }
}

// Request interface
export interface FetchFromSourceRequest {
  sourceId: string;
  force?: boolean; // Override fetch interval checks
}

// Response interface
export interface FetchFromSourceResponse {
  sourceId: string;
  fetchedItems: number;
  newItems: number;
  duration: number;
  items: any[]; // FetchedItem[]
  metadata: any; // FetchMetadata
  message: string;
}