import { UseCase } from '../../../../shared/application/base/UseCase';
import { Result } from '../../../../shared/domain/types/Result';
import { Publication, PublicationSummary } from '../../domain/entities/Publication';
import { PublicationRepository } from '../../domain/ports/PublicationRepository';
import { PublicationStatus } from '../../domain/value-objects/PublicationStatus';

/**
 * Use case for retrieving publications with filtering and pagination.
 *
 * This use case provides a unified interface for querying publications
 * with various filters and sorting options.
 */
export class GetPublications extends UseCase<GetPublicationsInput, GetPublicationsOutput, GetPublicationsError> {
  constructor(
    private readonly publicationRepository: PublicationRepository
  ) {
    super();
  }

  /**
   * Executes the get publications use case
   */
  protected async executeImpl(
    input: GetPublicationsInput
  ): Promise<Result<GetPublicationsOutput, GetPublicationsError>> {
    try {
      let publications: Publication[] = [];

      // Apply filters based on input
      if (input.articleId) {
        const result = await this.publicationRepository.findByArticleId(input.articleId);
        if (result.isFailure()) {
          return Result.failure(
            GetPublicationsError.repositoryError(result.error.message)
          );
        }
        publications = result.value;
      } else if (input.status) {
        const status = PublicationStatus.fromString(input.status);
        const result = await this.publicationRepository.findByStatus(status);
        if (result.isFailure()) {
          return Result.failure(
            GetPublicationsError.repositoryError(result.error.message)
          );
        }
        publications = result.value;
      } else if (input.platform) {
        const result = await this.publicationRepository.findByPlatform(input.platform);
        if (result.isFailure()) {
          return Result.failure(
            GetPublicationsError.repositoryError(result.error.message)
          );
        }
        publications = result.value;
      } else if (input.dateRange) {
        const result = await this.publicationRepository.findByDateRange(
          input.dateRange.startDate,
          input.dateRange.endDate
        );
        if (result.isFailure()) {
          return Result.failure(
            GetPublicationsError.repositoryError(result.error.message)
          );
        }
        publications = result.value;
      } else {
        // No specific filter, get ready for execution if requested
        if (input.readyForExecution) {
          const result = await this.publicationRepository.findReadyForExecution();
          if (result.isFailure()) {
            return Result.failure(
              GetPublicationsError.repositoryError(result.error.message)
            );
          }
          publications = result.value;
        } else {
          // Default behavior - this would need to be implemented based on your needs
          // For now, return empty array
          publications = [];
        }
      }

      // Apply additional filters
      let filteredPublications = publications;

      if (input.excludeStatuses && input.excludeStatuses.length > 0) {
        filteredPublications = filteredPublications.filter(
          pub => !input.excludeStatuses!.includes(pub.status.getValue())
        );
      }

      if (input.retryableOnly) {
        filteredPublications = filteredPublications.filter(pub => pub.canRetry());
      }

      // Sort publications
      if (input.sortBy) {
        filteredPublications = this.sortPublications(filteredPublications, input.sortBy, input.sortOrder);
      }

      // Apply pagination
      const total = filteredPublications.length;
      const page = input.page || 1;
      const limit = input.limit || 50;
      const offset = (page - 1) * limit;
      
      const paginatedPublications = filteredPublications.slice(offset, offset + limit);
      
      // Convert to summaries
      const summaries = paginatedPublications.map(pub => pub.getSummary());

      return Result.success({
        publications: summaries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          articleId: input.articleId,
          status: input.status,
          platform: input.platform,
          dateRange: input.dateRange,
          excludeStatuses: input.excludeStatuses,
          retryableOnly: input.retryableOnly,
          readyForExecution: input.readyForExecution
        }
      });

    } catch (error) {
      return Result.failure(
        GetPublicationsError.unexpectedError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        )
      );
    }
  }

  /**
   * Sorts publications based on the given criteria
   */
  private sortPublications(
    publications: Publication[],
    sortBy: SortField,
    sortOrder: SortOrder = 'desc'
  ): Publication[] {
    return publications.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'scheduledAt':
          const aScheduled = a.scheduledAt?.getTime() || 0;
          const bScheduled = b.scheduledAt?.getTime() || 0;
          comparison = aScheduled - bScheduled;
          break;
        case 'startedAt':
          const aStarted = a.startedAt?.getTime() || 0;
          const bStarted = b.startedAt?.getTime() || 0;
          comparison = aStarted - bStarted;
          break;
        case 'completedAt':
          const aCompleted = a.completedAt?.getTime() || 0;
          const bCompleted = b.completedAt?.getTime() || 0;
          comparison = aCompleted - bCompleted;
          break;
        case 'status':
          comparison = a.status.getValue().localeCompare(b.status.getValue());
          break;
        case 'platform':
          comparison = a.target.getPlatform().localeCompare(b.target.getPlatform());
          break;
        case 'retryCount':
          comparison = a.retryCount - b.retryCount;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}

/**
 * Input for GetPublications use case
 */
export interface GetPublicationsInput {
  // Filtering options
  articleId?: string;
  status?: string;
  platform?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  excludeStatuses?: string[];
  retryableOnly?: boolean;
  readyForExecution?: boolean;

  // Pagination options
  page?: number;
  limit?: number;

  // Sorting options
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

/**
 * Output for GetPublications use case
 */
export interface GetPublicationsOutput {
  publications: PublicationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    articleId?: string;
    status?: string;
    platform?: string;
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    excludeStatuses?: string[];
    retryableOnly?: boolean;
    readyForExecution?: boolean;
  };
}

/**
 * Sort field options
 */
export type SortField =
  | 'createdAt'
  | 'updatedAt'
  | 'scheduledAt'
  | 'startedAt'
  | 'completedAt'
  | 'status'
  | 'platform'
  | 'retryCount';

/**
 * Sort order options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Error types for GetPublications use case
 */
export class GetPublicationsError extends Error {
  constructor(
    message: string,
    public readonly code: GetPublicationsErrorCode,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GetPublicationsError';
  }

  static invalidInput(message: string): GetPublicationsError {
    return new GetPublicationsError(message, 'INVALID_INPUT');
  }

  static repositoryError(message: string): GetPublicationsError {
    return new GetPublicationsError(message, 'REPOSITORY_ERROR');
  }

  static unexpectedError(message: string): GetPublicationsError {
    return new GetPublicationsError(message, 'UNEXPECTED_ERROR');
  }
}

export type GetPublicationsErrorCode =
  | 'INVALID_INPUT'
  | 'REPOSITORY_ERROR'
  | 'UNEXPECTED_ERROR';