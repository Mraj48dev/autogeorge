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

      const total = sources.length;
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};

      sources.forEach(source => {
        const status = source.status.getValue();
        const type = source.type.getValue();

        byStatus[status] = (byStatus[status] || 0) + 1;
        byType[type] = (byType[type] || 0) + 1;
      });

      return Result.success({
        total,
        byType,
        byStatus,
        totalFetches: 0,
        totalItems: 0,
        totalErrors: byStatus['error'] || 0,
        lastFetchAt: undefined
      });
    } catch (error) {
      return Result.failure(new Error(`Failed to get statistics: ${error}`));
    }
  }

  // Additional methods for compatibility with FallbackSourceRepository
  async findByType(type: SourceType): Promise<Result<Source[], Error>> {
    try {
      const sources = Array.from(this.sources.values()).filter(
        source => source.type.getValue() === type.getValue()
      );
      return Result.success(sources);
    } catch (error) {
      return Result.failure(new Error(`Failed to find sources by type: ${error}`));
    }
  }

  async findByStatus(status: SourceStatus): Promise<Result<Source[], Error>> {
    try {
      const sources = Array.from(this.sources.values()).filter(
        source => source.status.getValue() === status.getValue()
      );
      return Result.success(sources);
    } catch (error) {
      return Result.failure(new Error(`Failed to find sources by status: ${error}`));
    }
  }

  async findActiveForFetching(): Promise<Result<Source[], Error>> {
    try {
      const sources = Array.from(this.sources.values()).filter(
        source => source.status.getValue() === 'active'
      );
      // Sort by lastFetchAt (oldest first, nulls last)
      sources.sort((a, b) => {
        if (!a.lastFetchAt && !b.lastFetchAt) return 0;
        if (!a.lastFetchAt) return 1;
        if (!b.lastFetchAt) return -1;
        return a.lastFetchAt.getTime() - b.lastFetchAt.getTime();
      });
      return Result.success(sources);
    } catch (error) {
      return Result.failure(new Error(`Failed to find active sources: ${error}`));
    }
  }

  async findNeedingAttention(): Promise<Result<Source[], Error>> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sources = Array.from(this.sources.values()).filter(source => {
        const status = source.status.getValue();
        if (status === 'error') return true;
        if (status === 'active') {
          return !source.lastFetchAt || source.lastFetchAt < oneDayAgo;
        }
        return false;
      });

      // Sort by status (errors first) then by lastFetchAt
      sources.sort((a, b) => {
        const statusA = a.status.getValue();
        const statusB = b.status.getValue();
        if (statusA === 'error' && statusB !== 'error') return -1;
        if (statusA !== 'error' && statusB === 'error') return 1;

        if (!a.lastFetchAt && !b.lastFetchAt) return 0;
        if (!a.lastFetchAt) return -1;
        if (!b.lastFetchAt) return 1;
        return a.lastFetchAt.getTime() - b.lastFetchAt.getTime();
      });

      return Result.success(sources);
    } catch (error) {
      return Result.failure(new Error(`Failed to find sources needing attention: ${error}`));
    }
  }

  async search(query: string, options: FindSourcesOptions = {}): Promise<Result<Source[], Error>> {
    try {
      let sources = Array.from(this.sources.values());

      // Apply filters
      if (options.type) {
        sources = sources.filter(s => s.type.getValue() === options.type);
      }
      if (options.status) {
        sources = sources.filter(s => s.status.getValue() === options.status);
      }

      // Apply search
      const queryLower = query.toLowerCase();
      sources = sources.filter(source => {
        const name = source.name.getValue().toLowerCase();
        const url = source.url?.getValue()?.toLowerCase() || '';
        return name.includes(queryLower) || url.includes(queryLower);
      });

      // Apply limit
      const limit = options.limit || 50;
      sources = sources.slice(0, limit);

      return Result.success(sources);
    } catch (error) {
      return Result.failure(new Error(`Failed to search sources: ${error}`));
    }
  }
}