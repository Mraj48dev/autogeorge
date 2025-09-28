import { Result } from '../../../shared/domain/types/Result';
import { UseCase } from '../../../shared/application/base/UseCase';
import { ImageRepository } from '../../domain/ports/ImageRepository';
import { ImageSearchService } from '../../domain/ports/ImageSearchService';
import { FeaturedImage } from '../../domain/entities/FeaturedImage';
import { Logger } from '../../infrastructure/logger/Logger';

export interface SearchAndGenerateImageRequest {
  articleId: string;
  aiPrompt: string;
  filename: string;
  altText: string;
  forceRegenerate?: boolean;
}

export interface SearchAndGenerateImageResponse {
  image: {
    id: string;
    articleId: string;
    url: string;
    filename: string;
    altText: string;
    status: string;
  };
  searchResults: {
    totalFound: number;
    selectedResult: number;
    searchQuery: string;
    processingTime: number;
  };
  metadata: {
    wasGenerated: boolean;
    provider: string;
    searchTime: number;
    totalTime: number;
  };
}

export interface SearchAndGenerateImageError {
  code: 'VALIDATION_ERROR' | 'SEARCH_FAILED' | 'GENERATION_FAILED' | 'SAVE_FAILED' | 'ALREADY_EXISTS';
  message: string;
  details?: any;
}

/**
 * Use Case: Search and Generate Featured Image
 *
 * Searches for a free image based on the AI prompt, or generates one if not found.
 * Saves the result to the database for later use in WordPress publication.
 */
export class SearchAndGenerateImage implements UseCase<SearchAndGenerateImageRequest, SearchAndGenerateImageResponse> {
  constructor(
    private imageRepository: ImageRepository,
    private imageSearchService: ImageSearchService,
    private logger: Logger
  ) {}

  async execute(request: SearchAndGenerateImageRequest): Promise<Result<SearchAndGenerateImageResponse, SearchAndGenerateImageError>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting image search and generation', {
        articleId: request.articleId,
        aiPrompt: request.aiPrompt,
        filename: request.filename
      });

      // Validate input
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure()) {
        return validationResult;
      }

      // Check if image already exists for this article
      if (!request.forceRegenerate) {
        const existingCheck = await this.imageRepository.findByArticleId(request.articleId);
        if (existingCheck.isSuccess() && existingCheck.value) {
          const existing = existingCheck.value;
          if (existing.isReadyForWordPress()) {
            this.logger.info('Image already exists and is ready', {
              articleId: request.articleId,
              imageId: existing.id.value
            });

            return Result.failure({
              code: 'ALREADY_EXISTS',
              message: `Image already exists for article ${request.articleId}`,
              details: { existingImageId: existing.id.value }
            });
          }
        }
      }

      // Create featured image entity
      const featuredImage = FeaturedImage.create(
        request.articleId,
        request.aiPrompt,
        request.filename,
        request.altText
      );

      // Save initial state
      const saveResult = await this.imageRepository.save(featuredImage);
      if (saveResult.isFailure()) {
        this.logger.error('Failed to save initial image state', {
          error: saveResult.error,
          articleId: request.articleId
        });

        return Result.failure({
          code: 'SAVE_FAILED',
          message: 'Failed to save image to database',
          details: saveResult.error
        });
      }

      // Step 1: Search for free images
      this.logger.info('Searching for free images', { aiPrompt: request.aiPrompt });
      featuredImage.markAsSearching(request.aiPrompt);

      const searchResult = await this.imageSearchService.searchImages({
        prompt: request.aiPrompt,
        maxResults: 10,
        copyrightFilter: 'free',
        safeSearch: true,
        size: 'large'
      });

      let wasGenerated = false;
      let selectedImageUrl = '';
      let searchMetadata = {
        totalFound: 0,
        selectedResult: -1,
        searchQuery: request.aiPrompt,
        processingTime: 0,
        provider: 'unknown'
      };

      if (searchResult.isSuccess() && searchResult.value.results.length > 0) {
        // Found free images - select the best one
        const bestImage = searchResult.value.results[0]; // Take the first result for now
        selectedImageUrl = bestImage.url;
        wasGenerated = false;

        searchMetadata = {
          totalFound: searchResult.value.results.length,
          selectedResult: 0,
          searchQuery: searchResult.value.searchQuery,
          processingTime: searchResult.value.processingTime,
          provider: searchResult.value.provider
        };

        this.logger.info('Found free image', {
          articleId: request.articleId,
          imageUrl: selectedImageUrl,
          totalResults: searchResult.value.results.length
        });

      } else {
        // No free images found - try to generate one
        this.logger.info('No free images found, attempting generation', {
          aiPrompt: request.aiPrompt,
          searchError: searchResult.isFailure() ? searchResult.error.message : 'No results'
        });

        const generationResult = await this.imageSearchService.generateImage(
          request.aiPrompt,
          'professional'
        );

        if (generationResult.isSuccess()) {
          selectedImageUrl = generationResult.value.url;
          wasGenerated = true;

          this.logger.info('Successfully generated image', {
            articleId: request.articleId,
            imageUrl: selectedImageUrl
          });

        } else {
          // Both search and generation failed
          const errorMessage = `Failed to find or generate image: ${generationResult.error.message}`;
          featuredImage.markAsFailed(errorMessage);

          await this.imageRepository.update(featuredImage);

          this.logger.error('Both image search and generation failed', {
            articleId: request.articleId,
            searchError: searchResult.isFailure() ? searchResult.error.message : 'No results',
            generationError: generationResult.error.message
          });

          return Result.failure({
            code: 'GENERATION_FAILED',
            message: errorMessage,
            details: {
              searchError: searchResult.isFailure() ? searchResult.error : null,
              generationError: generationResult.error
            }
          });
        }
      }

      // Update featured image with the found/generated URL
      featuredImage.markAsFound(selectedImageUrl);

      const updateResult = await this.imageRepository.update(featuredImage);
      if (updateResult.isFailure()) {
        this.logger.error('Failed to update image with URL', {
          error: updateResult.error,
          articleId: request.articleId,
          imageUrl: selectedImageUrl
        });

        return Result.failure({
          code: 'SAVE_FAILED',
          message: 'Failed to update image in database',
          details: updateResult.error
        });
      }

      const totalTime = Date.now() - startTime;

      this.logger.info('Image search and generation completed successfully', {
        articleId: request.articleId,
        imageId: featuredImage.id.value,
        imageUrl: selectedImageUrl,
        wasGenerated,
        totalTime
      });

      // Return successful result
      return Result.success({
        image: {
          id: featuredImage.id.value,
          articleId: featuredImage.articleId,
          url: featuredImage.url!.value,
          filename: featuredImage.filename.value,
          altText: featuredImage.altText.value,
          status: featuredImage.status.value
        },
        searchResults: searchMetadata,
        metadata: {
          wasGenerated,
          provider: searchMetadata.provider,
          searchTime: searchMetadata.processingTime,
          totalTime
        }
      });

    } catch (error) {
      this.logger.error('Unexpected error in SearchAndGenerateImage', {
        error,
        articleId: request.articleId
      });

      return Result.failure({
        code: 'SEARCH_FAILED',
        message: 'Unexpected error during image search and generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private validateRequest(request: SearchAndGenerateImageRequest): Result<void, SearchAndGenerateImageError> {
    if (!request.articleId || request.articleId.trim().length === 0) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'Article ID is required'
      });
    }

    if (!request.aiPrompt || request.aiPrompt.trim().length === 0) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'AI prompt is required'
      });
    }

    if (!request.filename || request.filename.trim().length === 0) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'Filename is required'
      });
    }

    if (!request.altText || request.altText.trim().length === 0) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'Alt text is required'
      });
    }

    // Validate AI prompt length (should be descriptive but not too long)
    if (request.aiPrompt.length < 10) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'AI prompt must be at least 10 characters long'
      });
    }

    if (request.aiPrompt.length > 500) {
      return Result.failure({
        code: 'VALIDATION_ERROR',
        message: 'AI prompt must be less than 500 characters'
      });
    }

    return Result.success(undefined);
  }
}