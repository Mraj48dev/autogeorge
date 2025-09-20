import { Result } from '../../shared/domain/types/Result';
import {
  SourceRepository,
  FindSourcesOptions,
  SourcePage,
  SourceSummaryPage,
  SourceStatistics
} from '../../domain/ports/SourceRepository';
import { Source, SourceSummary } from '../../domain/entities/Source';
import { SourceId } from '../../domain/value-objects/SourceId';
import { SourceType } from '../../domain/value-objects/SourceType';
import { SourceStatus } from '../../domain/value-objects/SourceStatus';
import { PrismaSourceRepository } from './PrismaSourceRepository';
import { InMemorySourceRepository } from './InMemorySourceRepository';

/**
 * Fallback Source Repository that automatically switches between Prisma and in-memory
 * when database operations fail. This ensures the application is never blocked by database issues.
 */
export class FallbackSourceRepository implements SourceRepository {
  private inMemoryRepo: InMemorySourceRepository;
  private usingFallback = false;

  constructor(private readonly prismaRepo: PrismaSourceRepository) {
    this.inMemoryRepo = new InMemorySourceRepository();
  }

  private async executeWithFallback<T>(
    operation: () => Promise<Result<T, Error>>,
    fallbackOperation: () => Promise<Result<T, Error>>,
    operationName: string
  ): Promise<Result<T, Error>> {
    if (this.usingFallback) {
      console.warn(`🔄 Using in-memory fallback for ${operationName}`);
      return fallbackOperation();
    }

    try {
      const result = await operation();
      if (result.isSuccess()) {
        return result;
      }

      // Check if the error is database-related
      if (this.isDatabaseError(result.error)) {
        console.warn(`⚠️ Database error detected for ${operationName}, switching to fallback:`, result.error.message);
        this.usingFallback = true;
        return fallbackOperation();
      }

      return result;
    } catch (error) {
      // Any uncaught errors are treated as database issues
      console.warn(`🚨 Uncaught error for ${operationName}, switching to fallback:`, error);
      this.usingFallback = true;
      return fallbackOperation();
    }
  }

  private isDatabaseError(error: Error): boolean {
    const dbErrorPatterns = [
      'Authentication failed',
      'Can\'t reach database server',
      'Connection terminated',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Database server',
      'Invalid \'prisma',
      'does not exist in the current database',
      'database credentials',
      'Connection pool',
    ];

    return dbErrorPatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async save(source: Source): Promise<Result<Source, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.save(source),
      () => this.inMemoryRepo.save(source),
      'save'
    );
  }

  async findById(id: SourceId): Promise<Result<Source | null, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findById(id),
      () => this.inMemoryRepo.findById(id),
      'findById'
    );
  }

  async findByType(type: SourceType): Promise<Result<Source[], Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findByType(type),
      () => this.inMemoryRepo.findByType ? this.inMemoryRepo.findByType(type) : Result.success([]),
      'findByType'
    );
  }

  async findByStatus(status: SourceStatus): Promise<Result<Source[], Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findByStatus(status),
      () => this.inMemoryRepo.findByStatus ? this.inMemoryRepo.findByStatus(status) : Result.success([]),
      'findByStatus'
    );
  }

  async findActiveForFetching(): Promise<Result<Source[], Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findActiveForFetching(),
      () => this.inMemoryRepo.findActiveForFetching ? this.inMemoryRepo.findActiveForFetching() : Result.success([]),
      'findActiveForFetching'
    );
  }

  async findNeedingAttention(): Promise<Result<Source[], Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findNeedingAttention(),
      () => this.inMemoryRepo.findNeedingAttention ? this.inMemoryRepo.findNeedingAttention() : Result.success([]),
      'findNeedingAttention'
    );
  }

  async findAll(options: FindSourcesOptions = {}): Promise<Result<SourcePage, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findAll(options),
      () => this.inMemoryRepo.findMany(options),
      'findAll'
    );
  }

  async findSummaries(options: FindSourcesOptions = {}): Promise<Result<SourceSummaryPage, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.findSummaries(options),
      () => this.inMemoryRepo.findSummaries(options),
      'findSummaries'
    );
  }

  async search(query: string, options: FindSourcesOptions = {}): Promise<Result<Source[], Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.search(query, options),
      () => this.inMemoryRepo.search ? this.inMemoryRepo.search(query, options) : Result.success([]),
      'search'
    );
  }

  async existsByTypeAndUrl(type: SourceType, url: string): Promise<Result<boolean, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.existsByTypeAndUrl(type, url),
      () => this.inMemoryRepo.findByTypeAndUrl(type.getValue(), url).then(result =>
        result.isSuccess() ? Result.success(result.value !== null) : result
      ),
      'existsByTypeAndUrl'
    );
  }

  async delete(id: SourceId): Promise<Result<void, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.delete(id),
      () => this.inMemoryRepo.delete(id).then(result =>
        result.isSuccess() ? Result.success(undefined) : result
      ),
      'delete'
    );
  }

  async updateLastFetch(id: SourceId, fetchTime: Date): Promise<Result<void, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.updateLastFetch(id, fetchTime),
      () => {
        // For in-memory, we need to update the source manually
        return this.inMemoryRepo.findById(id).then(findResult => {
          if (findResult.isFailure() || !findResult.value) {
            return Result.failure(new Error('Source not found for update'));
          }

          const source = findResult.value;
          source.lastFetchAt = fetchTime;
          source.updatedAt = new Date();

          return this.inMemoryRepo.save(source).then(saveResult =>
            saveResult.isSuccess() ? Result.success(undefined) : saveResult
          );
        });
      },
      'updateLastFetch'
    );
  }

  async bulkUpdateStatus(ids: SourceId[], status: SourceStatus): Promise<Result<number, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.bulkUpdateStatus(ids, status),
      () => {
        // For in-memory, update each source individually
        let count = 0;
        const updatePromises = ids.map(async (id) => {
          const findResult = await this.inMemoryRepo.findById(id);
          if (findResult.isSuccess() && findResult.value) {
            findResult.value.status = status;
            findResult.value.updatedAt = new Date();
            const saveResult = await this.inMemoryRepo.save(findResult.value);
            if (saveResult.isSuccess()) count++;
          }
        });

        return Promise.all(updatePromises).then(() => Result.success(count));
      },
      'bulkUpdateStatus'
    );
  }

  async getStatistics(): Promise<Result<SourceStatistics, Error>> {
    return this.executeWithFallback(
      () => this.prismaRepo.getStatistics(),
      () => this.inMemoryRepo.getStatistics(),
      'getStatistics'
    );
  }

  // Compatibility methods for InMemorySourceRepository interface
  async findMany(options: FindSourcesOptions = {}): Promise<Result<SourcePage, Error>> {
    return this.findAll(options);
  }

  async findByTypeAndUrl(type: string, url?: string): Promise<Result<Source | null, Error>> {
    const sourceType = SourceType.fromString(type);
    if (!url) {
      return Result.success(null);
    }

    return this.executeWithFallback(
      () => this.prismaRepo.existsByTypeAndUrl(sourceType, url).then(result =>
        result.isSuccess() && result.value ? this.prismaRepo.search(url, { type: sourceType }).then(searchResult =>
          searchResult.isSuccess() && searchResult.value.length > 0 ?
            Result.success(searchResult.value[0]) :
            Result.success(null)
        ) : Result.success(null)
      ),
      () => this.inMemoryRepo.findByTypeAndUrl(type, url),
      'findByTypeAndUrl'
    );
  }

  async exists(id: SourceId): Promise<Result<boolean, Error>> {
    return this.executeWithFallback(
      () => this.findById(id).then(result =>
        result.isSuccess() ? Result.success(result.value !== null) : result
      ),
      () => this.inMemoryRepo.exists(id),
      'exists'
    );
  }

  async count(options?: { type?: string; status?: string }): Promise<Result<number, Error>> {
    return this.executeWithFallback(
      () => {
        const findOptions: FindSourcesOptions = {};
        if (options?.type) findOptions.type = SourceType.fromString(options.type);
        if (options?.status) findOptions.status = SourceStatus.fromString(options.status);

        return this.findAll(findOptions).then(result =>
          result.isSuccess() ? Result.success(result.value.total) : result
        );
      },
      () => this.inMemoryRepo.count(options),
      'count'
    );
  }

  /**
   * Gets the current repository status
   */
  getStatus(): { usingFallback: boolean; repositoryType: string } {
    return {
      usingFallback: this.usingFallback,
      repositoryType: this.usingFallback ? 'in-memory' : 'prisma'
    };
  }

  /**
   * Resets the fallback status (useful for testing or manual recovery)
   */
  resetFallback(): void {
    this.usingFallback = false;
    console.log('🔄 Fallback repository reset - will attempt to use Prisma again');
  }
}