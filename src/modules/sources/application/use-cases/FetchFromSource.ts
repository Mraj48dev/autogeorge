import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository } from '../../domain/ports/SourceRepository';
import { FeedItemRepository, FeedItemForSave, SavedFeedItem, FeedItemStatus } from '../../domain/ports/FeedItemRepository';
import { SourceFetchService, FetchResult, FetchedItem } from '../../domain/ports/SourceFetchService';
import { ArticleAutoGenerator, FeedItemForGeneration } from '../../domain/ports/ArticleAutoGenerator';
import { SourceId } from '../../domain/value-objects/SourceId';
import { prisma } from '@/shared/database/prisma';

/**
 * Use case for fetching content from a specific source
 * Orchestrates the fetch process and updates source metadata
 */
export class FetchFromSource extends BaseUseCase<FetchFromSourceRequest, FetchFromSourceResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly feedItemRepository: FeedItemRepository,
    private readonly sourceFetchService: SourceFetchService,
    private readonly articleAutoGenerator: ArticleAutoGenerator
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

        // Trigger auto-generation if enabled globally - check for new items OR existing draft items
        let generatedArticles = 0;
        const shouldAutoGenerate = request.autoGenerate !== undefined ? request.autoGenerate : source.shouldAutoGenerate();
        if (shouldAutoGenerate && this.articleAutoGenerator) {
          // Get all items ready for processing (status = 'draft')
          const readyResult = await this.feedItemRepository.getReadyForProcessing(request.sourceId);
          let itemsToProcess: FeedItemForGeneration[] = [];

          if (savedFeedItems.length > 0) {
            // Process new items (only if they have status = 'draft')
            const newDraftItems = savedFeedItems.filter(item => item.status === 'draft');
            itemsToProcess = newDraftItems.map(item => ({
              id: item.id,
              guid: item.guid,
              title: item.title,
              content: item.content,
              url: item.url,
              publishedAt: item.publishedAt
            }));
            console.log(`🤖 Auto-generation enabled for source ${source.name.getValue()}, triggering for ${newDraftItems.length} new draft items...`);
          } else if (readyResult.isSuccess() && readyResult.value.length > 0) {
            // Process existing draft items
            const readyItems = readyResult.value;
            itemsToProcess = readyItems.map(item => ({
              id: item.id,
              guid: item.guid || item.id,
              title: item.title,
              content: item.content,
              url: item.url,
              publishedAt: item.publishedAt
            }));
            console.log(`🤖 Auto-generation enabled for source ${source.name.getValue()}, processing ${readyItems.length} existing draft items...`);
          }

          if (itemsToProcess.length > 0) {
            try {
              const autoGenResult = await this.articleAutoGenerator.generateFromFeedItems({
                sourceId: request.sourceId,
                feedItems: itemsToProcess,
                enableFeaturedImage: request.enableFeaturedImage,
                enableAutoPublish: request.enableAutoPublish
              });

              if (autoGenResult.isSuccess()) {
                const genResult = autoGenResult.value;
                generatedArticles = genResult.summary.successful;
                console.log(`✅ Auto-generation completed for source ${source.name.getValue()}: ${generatedArticles}/${genResult.summary.total} articles generated`);

                // Mark successfully generated feed items as processed
                // The ArticleAutoGenerator already saves articles as drafts in /admin/articles
                for (const result of genResult.generatedArticles) {
                  if (result.success && result.articleId) {
                    await this.feedItemRepository.updateStatus(result.feedItemId, 'processed', result.articleId);
                    console.log(`📝 Article draft created and saved in /admin/articles with ID: ${result.articleId}`);
                  }
                }
              } else {
                console.error(`❌ Auto-generation failed for source ${source.name.getValue()}:`, autoGenResult.error.message);
              }
            } catch (error) {
              console.error(`💥 Auto-generation error for source ${source.name.getValue()}:`, error);
            }
          }
        }

        return Result.success({
          sourceId: source.id.getValue(),
          fetchedItems: result.fetchedItems.length,
          newItems: savedFeedItems.length,
          generatedArticles,
          duration,
          items: savedFeedItems,
          metadata: result.metadata,
          message: `Successfully fetched ${savedFeedItems.length} new items from ${result.fetchedItems.length} total items${generatedArticles > 0 ? `, generated ${generatedArticles} articles` : ''}`
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
          // Determine status based on auto-generation settings
          const initialStatus = await this.determineInitialStatus();

          // Create new FeedItem using Domain entities
          const feedItemForSave: FeedItemForSave = {
            sourceId,
            guid: itemGuid,
            title: item.title || 'Untitled',
            content: item.content || '',
            url: item.url,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            fetchedAt: new Date(),
            status: initialStatus, // New: Sources Module sets this based on auto-generation settings
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

  /**
   * Determines initial status for new feed items based on auto-generation settings
   * Sources Module responsibility: set correct status based on WordPress configuration
   */
  private async determineInitialStatus(): Promise<FeedItemStatus> {
    try {
      // Read WordPress settings for the default user
      // In a real app, this would be user-specific from the request context
      const wordPressSite = await prisma.wordPressSite.findUnique({
        where: { userId: 'demo-user' }, // TODO: Get from auth context
        select: { enableAutoGeneration: true }
      });

      if (wordPressSite?.enableAutoGeneration) {
        console.log(`🤖 Auto-generation enabled → Setting status: draft`);
        return 'draft'; // Ready for Content Module to process
      } else {
        console.log(`⏸️ Auto-generation disabled → Setting status: pending`);
        return 'pending'; // Not for processing
      }
    } catch (error) {
      console.error(`❌ Error reading WordPress settings, defaulting to 'pending':`, error);
      return 'pending'; // Safe default
    }
  }
}

// Request interface
export interface FetchFromSourceRequest {
  sourceId: string;
  force?: boolean; // Override fetch interval checks
  autoGenerate?: boolean; // Override autoGenerate flag from global settings
  enableFeaturedImage?: boolean; // Enable featured image generation
  enableAutoPublish?: boolean; // Enable auto-publishing to WordPress
}

// Response interface
export interface FetchFromSourceResponse {
  sourceId: string;
  fetchedItems: number;
  newItems: number;
  generatedArticles?: number;
  duration: number;
  items: any[]; // FetchedItem[]
  metadata: any; // FetchMetadata
  message: string;
}