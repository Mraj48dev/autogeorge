import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository } from '../../domain/ports/SourceRepository';
import { SourceFetchService, FetchResult, FetchedItem } from '../../domain/ports/SourceFetchService';
import { SourceId } from '../../domain/value-objects/SourceId';
import { prisma } from '../../../../shared/database/prisma';

/**
 * Use case for fetching content from a specific source
 * Orchestrates the fetch process and updates source metadata
 */
export class FetchFromSource extends BaseUseCase<FetchFromSourceRequest, FetchFromSourceResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly sourceFetchService: SourceFetchService
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

        return Result.success({
          sourceId: source.id.getValue(),
          fetchedItems: result.fetchedItems.length,
          newItems: savedArticles.length,
          duration,
          items: savedArticles,
          metadata: result.metadata,
          message: `Successfully fetched ${savedArticles.length} new items from ${result.fetchedItems.length} total items`
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

    for (const item of fetchedItems) {
      try {
        // Check if article already exists to avoid duplicates
        const existingArticle = await prisma.article.findFirst({
          where: {
            AND: [
              { sourceId },
              {
                OR: [
                  { title: item.title },
                  { content: { contains: item.content.substring(0, 100) } }
                ]
              }
            ]
          }
        });

        if (!existingArticle) {
          // Create new article as draft (raw content, not yet processed)
          const savedArticle = await prisma.article.create({
            data: {
              title: item.title || 'Untitled',
              content: item.content || '',
              status: 'draft', // Raw content from feed, not yet processed by AI
              sourceId: sourceId,
            }
          });

          savedArticles.push(savedArticle);
          console.log(`✅ Saved article: ${savedArticle.title}`);
        } else {
          console.log(`⚠️ Duplicate article skipped: ${item.title}`);
        }
      } catch (error) {
        console.error(`❌ Error saving article "${item.title}":`, error);
        // Continue with other articles even if one fails
      }
    }

    console.log(`💾 Saved ${savedArticles.length} articles out of ${fetchedItems.length} fetched`);
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
  duration: number;
  items: any[]; // FetchedItem[]
  metadata: any; // FetchMetadata
  message: string;
}