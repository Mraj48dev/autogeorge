import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository } from '../../domain/ports/SourceRepository';
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
    private readonly sourceFetchService: SourceFetchService,
    private readonly articleAutoGenerator?: ArticleAutoGenerator
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

        // Save articles to database
        const savedArticles = await this.saveArticlesToDatabase(result.newItems, request.sourceId);

        // Record successful fetch
        source.recordSuccessfulFetch(
          result.fetchedItems.length,
          savedArticles.length,
          duration,
          result.metadata
        );

        // Save updated source
        const saveResult = await this.sourceRepository.save(source);
        if (saveResult.isFailure()) {
          return Result.failure(saveResult.error);
        }

        // Trigger auto-generation if enabled and there are new items
        let generatedArticles = 0;
        if (savedArticles.length > 0 && source.shouldAutoGenerate() && this.articleAutoGenerator) {
          console.log(`🤖 Auto-generation enabled for source ${source.name.getValue()}, triggering for ${savedArticles.length} new items...`);

          try {
            const feedItemsForGeneration: FeedItemForGeneration[] = savedArticles.map(item => ({
              id: item.id,
              guid: item.guid,
              title: item.title,
              content: item.content,
              url: item.url,
              publishedAt: item.publishedAt
            }));

            const autoGenResult = await this.articleAutoGenerator.generateFromFeedItems({
              sourceId: request.sourceId,
              feedItems: feedItemsForGeneration
            });

            if (autoGenResult.isSuccess()) {
              const genResult = autoGenResult.value;
              generatedArticles = genResult.summary.successful;
              console.log(`✅ Auto-generation completed for source ${source.name.getValue()}: ${generatedArticles}/${genResult.summary.total} articles generated`);

              // Mark successfully generated feed items as processed
              for (const result of genResult.generatedArticles) {
                if (result.success && result.articleId) {
                  await prisma.feedItem.update({
                    where: { id: result.feedItemId },
                    data: {
                      processed: true,
                      articleId: result.articleId
                    }
                  });
                }
              }
            } else {
              console.error(`❌ Auto-generation failed for source ${source.name.getValue()}:`, autoGenResult.error.message);
            }
          } catch (error) {
            console.error(`💥 Auto-generation error for source ${source.name.getValue()}:`, error);
          }
        }

        return Result.success({
          sourceId: source.id.getValue(),
          fetchedItems: result.fetchedItems.length,
          newItems: savedArticles.length,
          generatedArticles,
          duration,
          items: savedArticles,
          metadata: result.metadata,
          message: `Successfully fetched ${savedArticles.length} new items from ${result.fetchedItems.length} total items${generatedArticles > 0 ? `, generated ${generatedArticles} articles` : ''}`
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

  private async saveArticlesToDatabase(fetchedItems: FetchedItem[], sourceId: string): Promise<any[]> {
    const savedArticles: any[] = [];
    const errors: any[] = []; // TEMP DEBUG: Collect all errors

    console.log(`🔍 Processing ${fetchedItems.length} fetched items for sourceId: ${sourceId}`);

    for (const item of fetchedItems) {
      try {
        const itemGuid = item.id || item.metadata?.guid; // GUID is in item.id field
        console.log(`🔍 Processing item: ${item.title} | id: ${item.id} | url: ${item.url} | guid: ${itemGuid}`);

        // Check if content already exists to avoid duplicates using Content table (feed_items)
        // Only use GUID and URL for deduplication - title+date was causing false positives
        const whereConditions = [
          // Primary: match by GUID/ID if it exists
          ...(itemGuid ? [{ guid: itemGuid }] : []),
          // Secondary: match by URL if it exists and is different from GUID
          ...(item.url && item.url !== itemGuid ? [{ url: item.url }] : [])
        ];

        // Re-enable deduplication but only check GUID in same source
        const existingContent = itemGuid
          ? await prisma.feedItem.findFirst({
              where: {
                sourceId,
                guid: itemGuid
              }
            })
          : null;

        if (!existingContent) {
          console.log(`✅ Creating new content: ${item.title} (guid: ${itemGuid})`);
          // Create new content (feed item) - NOT processed article yet!
          const publishedAt = item.publishedAt ? new Date(item.publishedAt) : new Date();
          console.log(`📅 PublishedAt: original=${item.publishedAt} | parsed=${publishedAt}`);

          const savedContent = await prisma.feedItem.create({
            data: {
              sourceId: sourceId,
              guid: itemGuid || item.url || `${sourceId}-${Date.now()}`,
              title: item.title || 'Untitled',
              content: item.content || '',
              url: item.url,
              publishedAt,
              fetchedAt: new Date(),
              processed: false, // NOT processed by AI yet
            }
          });

          savedArticles.push(savedContent);
          console.log(`✅ Saved content (feed item): ${savedContent.title}`);
        } else {
          console.log(`⚠️ Duplicate content skipped: ${item.title} (found existing: ${existingContent?.title})`);
        }
      } catch (error) {
        console.error(`❌ Error saving content "${item.title}":`, error);
        console.error('Full error details:', error);
        errors.push({
          title: item.title,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue with other articles even if one fails
      }
    }

    console.log(`💾 Saved ${savedArticles.length} articles out of ${fetchedItems.length} fetched`);

    // TEMPORARY DEBUG: Return error details if no items were saved
    if (savedArticles.length === 0 && fetchedItems.length > 0) {
      console.error(`🚨 CRITICAL: 0 items saved from ${fetchedItems.length} fetched items!`);
      console.error('All errors:', errors);
      // This suggests all items were either duplicates or failed to save
    }

    return savedArticles;
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
  generatedArticles?: number;
  duration: number;
  items: any[]; // FetchedItem[]
  metadata: any; // FetchMetadata
  message: string;
}