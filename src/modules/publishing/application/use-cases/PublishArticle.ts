import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../../../shared/domain/types/Result';
import { Publication, PublicationMetadata } from '../../domain/entities/Publication';
import { PublicationTarget } from '../../domain/value-objects/PublicationTarget';
import { PublicationRepository } from '../../domain/ports/PublicationRepository';
import { PublishingService, PublishingContent } from '../../domain/ports/PublishingService';

/**
 * Use case for publishing an article to a specific platform.
 *
 * This use case orchestrates the publishing process by:
 * 1. Creating a publication record
 * 2. Calling the appropriate publishing service
 * 3. Updating the publication status
 * 4. Handling errors and retries
 */
export class PublishArticle extends UseCase<PublishArticleInput, PublishArticleOutput, PublishArticleError> {
  constructor(
    private readonly publicationRepository: PublicationRepository,
    private readonly publishingService: PublishingService
  ) {
    super();
  }

  /**
   * Executes the publish article use case
   */
  protected async executeImpl(
    input: PublishArticleInput
  ): Promise<Result<PublishArticleOutput, PublishArticleError>> {
    try {
      // Validate target configuration
      const targetValidation = await this.publishingService.validateTarget(input.target);
      if (targetValidation.isFailure()) {
        return Result.failure(
          PublishArticleError.invalidTarget(targetValidation.error.message)
        );
      }

      if (!targetValidation.value.isValid) {
        return Result.failure(
          PublishArticleError.invalidTarget(targetValidation.value.errors.join(', '))
        );
      }

      // Check if publication already exists for this article and target
      const existsResult = await this.publicationRepository.existsForArticleAndTarget(
        input.articleId,
        input.target.getPlatform(),
        input.target.getSiteId()
      );

      if (existsResult.isFailure()) {
        return Result.failure(
          PublishArticleError.repositoryError(existsResult.error.message)
        );
      }

      if (existsResult.value && !input.allowDuplicate) {
        return Result.failure(
          PublishArticleError.duplicatePublication(
            `Article ${input.articleId} is already published to ${input.target.toString()}`
          )
        );
      }

      // Create publication record
      const publication = input.scheduledAt
        ? Publication.createScheduled(
            input.articleId,
            input.target,
            input.metadata,
            input.scheduledAt
          )
        : Publication.createImmediate(
            input.articleId,
            input.target,
            input.metadata
          );

      // Save publication record
      const saveResult = await this.publicationRepository.save(publication);
      if (saveResult.isFailure()) {
        return Result.failure(
          PublishArticleError.repositoryError(saveResult.error.message)
        );
      }

      // If scheduled, don't publish yet
      if (input.scheduledAt && input.scheduledAt > new Date()) {
        return Result.success({
          publicationId: publication.id.getValue(),
          status: 'scheduled',
          scheduledAt: input.scheduledAt,
          message: 'Article scheduled for publication'
        });
      }

      // Start publication process
      publication.start();
      await this.publicationRepository.save(publication);

      // Prepare content for publishing
      const content: PublishingContent = {
        title: input.content.title,
        content: input.content.content,
        excerpt: input.content.excerpt,
        featuredImageUrl: input.content.featuredImageUrl,
        attachments: input.content.attachments
      };

      // Publish to target platform
      const publishResult = await this.publishingService.publish(
        input.target,
        content,
        input.metadata
      );

      if (publishResult.isFailure()) {
        // Mark publication as failed
        const error = {
          code: publishResult.error.code,
          message: publishResult.error.message,
          details: publishResult.error.details,
          timestamp: new Date(),
          isRetryable: publishResult.error.isRetryable
        };

        publication.fail(error);
        await this.publicationRepository.save(publication);

        return Result.failure(
          PublishArticleError.publishingFailed(publishResult.error.message)
        );
      }

      // Mark publication as completed
      publication.complete(
        publishResult.value.externalId,
        publishResult.value.externalUrl
      );
      await this.publicationRepository.save(publication);

      return Result.success({
        publicationId: publication.id.getValue(),
        externalId: publishResult.value.externalId,
        externalUrl: publishResult.value.externalUrl,
        status: 'completed',
        publishedAt: new Date(),
        warnings: publishResult.value.warnings,
        message: 'Article published successfully'
      });

    } catch (error) {
      return Result.failure(
        PublishArticleError.unexpectedError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      );
    }
  }
}

/**
 * Input for PublishArticle use case
 */
export interface PublishArticleInput {
  articleId: string;
  target: PublicationTarget;
  content: PublishingContent;
  metadata: PublicationMetadata;
  scheduledAt?: Date;
  allowDuplicate?: boolean;
}

/**
 * Output for PublishArticle use case
 */
export interface PublishArticleOutput {
  publicationId: string;
  externalId?: string;
  externalUrl?: string;
  status: 'scheduled' | 'completed';
  publishedAt?: Date;
  scheduledAt?: Date;
  warnings?: string[];
  message: string;
}

/**
 * Error types for PublishArticle use case
 */
export class PublishArticleError extends Error {
  constructor(
    message: string,
    public readonly code: PublishArticleErrorCode,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PublishArticleError';
  }

  static invalidInput(message: string): PublishArticleError {
    return new PublishArticleError(message, 'INVALID_INPUT');
  }

  static invalidTarget(message: string): PublishArticleError {
    return new PublishArticleError(message, 'INVALID_TARGET');
  }

  static duplicatePublication(message: string): PublishArticleError {
    return new PublishArticleError(message, 'DUPLICATE_PUBLICATION');
  }

  static repositoryError(message: string): PublishArticleError {
    return new PublishArticleError(message, 'REPOSITORY_ERROR');
  }

  static publishingFailed(message: string): PublishArticleError {
    return new PublishArticleError(message, 'PUBLISHING_FAILED');
  }

  static unexpectedError(message: string): PublishArticleError {
    return new PublishArticleError(message, 'UNEXPECTED_ERROR');
  }
}

export type PublishArticleErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_TARGET'
  | 'DUPLICATE_PUBLICATION'
  | 'REPOSITORY_ERROR'
  | 'PUBLISHING_FAILED'
  | 'UNEXPECTED_ERROR';