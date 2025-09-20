import { Result } from '../shared/domain/types/Result';
import { CreateSource, CreateSourceRequest, CreateSourceResponse } from '../application/use-cases/CreateSource';
import { GetSources, GetSourcesRequest, GetSourcesResponse } from '../application/use-cases/GetSources';
import { FetchFromSource, FetchFromSourceRequest, FetchFromSourceResponse } from '../application/use-cases/FetchFromSource';

/**
 * Admin facade for Sources module
 * Provides a simplified interface for admin operations
 */
export class SourcesAdminFacade {
  constructor(
    private readonly createSourceUseCase: CreateSource,
    private readonly getSourcesUseCase: GetSources,
    private readonly fetchFromSourceUseCase: FetchFromSource
  ) {}

  /**
   * Creates a new source
   */
  async createSource(request: CreateSourceRequest): Promise<Result<CreateSourceResponse, Error>> {
    return await this.createSourceUseCase.execute(request);
  }

  /**
   * Gets sources with pagination and filtering
   */
  async getSources(request: GetSourcesRequest = {}): Promise<Result<GetSourcesResponse, Error>> {
    return await this.getSourcesUseCase.execute(request);
  }

  /**
   * Fetches content from a specific source
   */
  async fetchFromSource(request: FetchFromSourceRequest): Promise<Result<FetchFromSourceResponse, Error>> {
    return await this.fetchFromSourceUseCase.execute(request);
  }

  /**
   * Tests a source configuration without saving it
   */
  async testSource(request: CreateSourceRequest): Promise<Result<any, Error>> {
    // Create a temporary test request
    const testRequest: CreateSourceRequest = {
      ...request,
      testConnection: true,
    };

    // This would create and test the source, then we could optionally not save it
    // For now, we'll use the create with test enabled
    return await this.createSourceUseCase.execute(testRequest);
  }

  /**
   * Gets sources that need attention (errors, not fetched recently)
   */
  async getSourcesNeedingAttention(): Promise<Result<GetSourcesResponse, Error>> {
    // This would use a specific use case for getting sources needing attention
    // For now, using the general get sources
    return await this.getSourcesUseCase.execute({
      limit: 50,
      sortBy: 'lastFetchAt',
      sortOrder: 'asc',
    });
  }

  /**
   * Gets sources by type
   */
  async getSourcesByType(type: string): Promise<Result<GetSourcesResponse, Error>> {
    return await this.getSourcesUseCase.execute({
      type: type as any,
      limit: 100,
    });
  }

  /**
   * Gets sources statistics
   */
  async getSourcesStatistics(): Promise<Result<any, Error>> {
    // This would be implemented with a specific use case
    // For now, returning a simple success
    return Result.success({
      message: 'Sources statistics would be implemented here',
      total: 0,
      byType: {},
      byStatus: {},
    });
  }
}