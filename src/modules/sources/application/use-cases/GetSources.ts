import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository, FindSourcesOptions, SourceSummaryPage } from '../../domain/ports/SourceRepository';

/**
 * Use case for retrieving sources with pagination and filtering
 */
export class GetSources extends BaseUseCase<GetSourcesRequest, GetSourcesResponse> {
  constructor(private readonly sourceRepository: SourceRepository) {
    super();
  }

  async execute(request: GetSourcesRequest): Promise<Result<GetSourcesResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateGetSourcesRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Build options
      const options: FindSourcesOptions = {
        page: request.page || 1,
        limit: Math.min(request.limit || 20, 100), // Max 100 items per page
        sortBy: request.sortBy || 'createdAt',
        sortOrder: request.sortOrder || 'desc',
      };

      if (request.type) {
        options.type = request.type;
      }

      if (request.status) {
        options.status = request.status;
      }

      // Get sources
      const sourcesResult = await this.sourceRepository.findSummaries(options);
      if (sourcesResult.isFailure()) {
        return Result.failure(sourcesResult.error);
      }

      const sourcePage = sourcesResult.value;

      return Result.success({
        sources: sourcePage.sources,
        pagination: {
          page: sourcePage.page,
          limit: sourcePage.limit,
          total: sourcePage.total,
          totalPages: sourcePage.totalPages,
          hasNext: sourcePage.page < sourcePage.totalPages,
          hasPrev: sourcePage.page > 1,
        }
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to get sources'));
    }
  }

  private validateGetSourcesRequest(request: GetSourcesRequest): Result<void, Error> {
    if (request.page && request.page < 1) {
      return Result.failure(new Error('Page must be greater than 0'));
    }

    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      return Result.failure(new Error('Limit must be between 1 and 100'));
    }

    const validSortFields = ['name', 'type', 'status', 'createdAt', 'lastFetchAt'];
    if (request.sortBy && !validSortFields.includes(request.sortBy)) {
      return Result.failure(new Error(`Invalid sortBy field. Valid fields: ${validSortFields.join(', ')}`));
    }

    const validSortOrders = ['asc', 'desc'];
    if (request.sortOrder && !validSortOrders.includes(request.sortOrder)) {
      return Result.failure(new Error(`Invalid sortOrder. Valid orders: ${validSortOrders.join(', ')}`));
    }

    return Result.success(undefined);
  }
}

// Request interface
export interface GetSourcesRequest {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'status' | 'createdAt' | 'lastFetchAt';
  sortOrder?: 'asc' | 'desc';
  type?: any; // SourceType - will be converted
  status?: any; // SourceStatus - will be converted
}

// Response interface
export interface GetSourcesResponse {
  sources: any[]; // SourceSummary[]
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}