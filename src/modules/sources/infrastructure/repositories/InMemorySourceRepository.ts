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

/**
 * In-Memory implementation of SourceRepository
 * Used as fallback when database is not available
 */
export class InMemorySourceRepository implements SourceRepository {
  private sources: Map<string, Source> = new Map();

  async save(source: Source): Promise<Result<Source, Error>> {
    try {
      this.sources.set(source.id.getValue(), source);
      return Result.success(source);
    } catch (error) {
      return Result.failure(new Error(`Failed to save source: ${error}`));
    }
  }

  async findById(id: SourceId): Promise<Result<Source | null, Error>> {
    try {
      const source = this.sources.get(id.getValue()) || null;
      return Result.success(source);
    } catch (error) {
      return Result.failure(new Error(`Failed to find source: ${error}`));
    }
  }

  async findByTypeAndUrl(type: string, url?: string): Promise<Result<Source | null, Error>> {
    try {
      for (const source of this.sources.values()) {
        if (source.type.getValue() === type && source.url?.getValue() === url) {
          return Result.success(source);
        }
      }
      return Result.success(null);
    } catch (error) {
      return Result.failure(new Error(`Failed to find source: ${error}`));
    }
  }

  async findMany(options: FindSourcesOptions = {}): Promise<Result<SourcePage, Error>> {
    try {
      let sources = Array.from(this.sources.values());

      // Apply filters
      if (options.type) {
        sources = sources.filter(s => s.type.getValue() === options.type);
      }
      if (options.status) {
        sources = sources.filter(s => s.status.getValue() === options.status);
      }

      // Apply sorting
      sources.sort((a, b) => {
        const field = options.sortBy || 'createdAt';
        const order = options.sortOrder === 'asc' ? 1 : -1;

        let aVal: any, bVal: any;
        switch (field) {
          case 'name':
            aVal = a.name.getValue();
            bVal = b.name.getValue();
            break;
          case 'type':
            aVal = a.type.getValue();
            bVal = b.type.getValue();
            break;
          case 'status':
            aVal = a.status.getValue();
            bVal = b.status.getValue();
            break;
          default:
            aVal = a.createdAt;
            bVal = b.createdAt;
        }

        return aVal < bVal ? -order : aVal > bVal ? order : 0;
      });

      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;
      const paginatedSources = sources.slice(offset, offset + limit);

      return Result.success({
        sources: paginatedSources,
        totalCount: sources.length,
        page,
        limit,
        totalPages: Math.ceil(sources.length / limit)
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to find sources: ${error}`));
    }
  }

  async findSummaries(options: FindSourcesOptions = {}): Promise<Result<SourceSummaryPage, Error>> {
    try {
      const result = await this.findMany(options);
      if (result.isFailure()) {
        return Result.failure(result.error);
      }

      const summaries = result.value.sources.map(source => source.getSummary());

      return Result.success({
        sources: summaries,
        totalCount: result.value.totalCount,
        page: result.value.page,
        limit: result.value.limit,
        totalPages: result.value.totalPages
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to find source summaries: ${error}`));
    }
  }

  async delete(id: SourceId): Promise<Result<boolean, Error>> {
    try {
      const deleted = this.sources.delete(id.getValue());
      return Result.success(deleted);
    } catch (error) {
      return Result.failure(new Error(`Failed to delete source: ${error}`));
    }
  }

  async exists(id: SourceId): Promise<Result<boolean, Error>> {
    try {
      const exists = this.sources.has(id.getValue());
      return Result.success(exists);
    } catch (error) {
      return Result.failure(new Error(`Failed to check source existence: ${error}`));
    }
  }

  async count(options?: { type?: string; status?: string }): Promise<Result<number, Error>> {
    try {
      let sources = Array.from(this.sources.values());

      if (options?.type) {
        sources = sources.filter(s => s.type.getValue() === options.type);
      }
      if (options?.status) {
        sources = sources.filter(s => s.status.getValue() === options.status);
      }

      return Result.success(sources.length);
    } catch (error) {
      return Result.failure(new Error(`Failed to count sources: ${error}`));
    }
  }

  async getStatistics(): Promise<Result<SourceStatistics, Error>> {
    try {
      const sources = Array.from(this.sources.values());

      const totalSources = sources.length;
      const activeSources = sources.filter(s => s.status.getValue() === 'active').length;
      const errorSources = sources.filter(s => s.status.getValue() === 'error').length;
      const sourcesByType = sources.reduce((acc, source) => {
        const type = source.type.getValue();
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Result.success({
        totalSources,
        activeSources,
        errorSources,
        sourcesByType
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to get statistics: ${error}`));
    }
  }
}