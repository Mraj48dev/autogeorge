import { PrismaClient } from '@prisma/client';
import { Result } from '../../shared/domain/types/Result';
import {
  SourceRepository,
  FindSourcesOptions,
  SourcePage,
  SourceSummaryPage,
  SourceStatistics
} from '../../domain/ports/SourceRepository';
import { Source, SourceSummary, SourceConfiguration, SourceMetadata } from '../../domain/entities/Source';
import { SourceId } from '../../domain/value-objects/SourceId';
import { SourceName } from '../../domain/value-objects/SourceName';
import { SourceType } from '../../domain/value-objects/SourceType';
import { SourceStatus } from '../../domain/value-objects/SourceStatus';
import { SourceUrl } from '../../domain/value-objects/SourceUrl';

/**
 * Prisma implementation of SourceRepository
 * Handles all database operations for sources using Prisma ORM
 */
export class PrismaSourceRepository implements SourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(source: Source): Promise<Result<Source, Error>> {
    try {
      console.log(`🔄 [PrismaSourceRepository] Saving source ${source.id.getValue()}`, {
        sourceId: source.id.getValue(),
        sourceName: source.name.getValue(),
        defaultCategory: source.defaultCategory,
        configuration: source.configuration,
        autoGenerate: source.configuration?.autoGenerate,
        configurationKeys: source.configuration ? Object.keys(source.configuration) : []
      });

      const data = {
        id: source.id.getValue(),
        name: source.name.getValue(),
        type: source.type.getValue(),
        status: source.status.getValue(),
        url: source.url?.getValue(),
        defaultCategory: source.defaultCategory,
        configuration: source.configuration as any,
        metadata: source.metadata as any,
        lastFetchAt: source.lastFetchAt,
        lastErrorAt: source.lastErrorAt,
        lastError: source.lastError && typeof source.lastError === 'object'
          ? source.lastError.toString()
          : source.lastError,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };

      console.log(`📝 [PrismaSourceRepository] Data being saved to DB:`, {
        sourceId: data.id,
        defaultCategory: data.defaultCategory,
        configuration: data.configuration,
        autoGenerate: data.configuration?.autoGenerate
      });

      const savedSource = await this.prisma.source.upsert({
        where: { id: source.id.getValue() },
        create: data,
        update: {
          name: data.name,
          status: data.status,
          url: data.url,
          defaultCategory: data.defaultCategory,
          configuration: data.configuration,
          metadata: data.metadata,
          lastFetchAt: data.lastFetchAt,
          lastErrorAt: data.lastErrorAt,
          lastError: data.lastError,
          updatedAt: data.updatedAt,
        },
      });

      console.log(`✅ [PrismaSourceRepository] Source saved to DB:`, {
        sourceId: savedSource.id,
        defaultCategory: savedSource.defaultCategory,
        configuration: savedSource.configuration,
        autoGenerate: (savedSource.configuration as any)?.autoGenerate
      });

      const domainSource = this.toDomainSource(savedSource);

      console.log(`🔄 [PrismaSourceRepository] Domain source created:`, {
        sourceId: domainSource.id.getValue(),
        configuration: domainSource.configuration,
        autoGenerate: domainSource.configuration?.autoGenerate
      });

      return Result.success(domainSource);

    } catch (error) {
      return Result.failure(new Error(`Failed to save source: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findById(id: SourceId): Promise<Result<Source | null, Error>> {
    try {
      const source = await this.prisma.source.findUnique({
        where: { id: id.getValue() },
      });

      if (!source) {
        return Result.success(null);
      }

      const domainSource = this.toDomainSource(source);
      return Result.success(domainSource);

    } catch (error) {
      return Result.failure(new Error(`Failed to find source by ID: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findByType(type: SourceType): Promise<Result<Source[], Error>> {
    try {
      const sources = await this.prisma.source.findMany({
        where: { type: type.getValue() },
        orderBy: { createdAt: 'desc' },
      });

      const domainSources = sources.map(source => this.toDomainSource(source));
      return Result.success(domainSources);

    } catch (error) {
      return Result.failure(new Error(`Failed to find sources by type: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findByStatus(status: SourceStatus): Promise<Result<Source[], Error>> {
    try {
      const sources = await this.prisma.source.findMany({
        where: { status: status.getValue() },
        orderBy: { updatedAt: 'desc' },
      });

      const domainSources = sources.map(source => this.toDomainSource(source));
      return Result.success(domainSources);

    } catch (error) {
      return Result.failure(new Error(`Failed to find sources by status: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findActiveForFetching(): Promise<Result<Source[], Error>> {
    try {
      const sources = await this.prisma.source.findMany({
        where: { status: 'active' },
        orderBy: { lastFetchAt: 'asc' }, // Oldest first
      });

      const domainSources = sources.map(source => this.toDomainSource(source));
      return Result.success(domainSources);

    } catch (error) {
      return Result.failure(new Error(`Failed to find active sources: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findNeedingAttention(): Promise<Result<Source[], Error>> {
    try {
      // Sources that are in error state or haven't been fetched recently
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const sources = await this.prisma.source.findMany({
        where: {
          OR: [
            { status: 'error' },
            {
              AND: [
                { status: 'active' },
                {
                  OR: [
                    { lastFetchAt: null },
                    { lastFetchAt: { lt: oneDayAgo } }
                  ]
                }
              ]
            }
          ]
        },
        orderBy: [
          { status: 'asc' }, // errors first
          { lastFetchAt: 'asc' } // oldest first
        ],
      });

      const domainSources = sources.map(source => this.toDomainSource(source));
      return Result.success(domainSources);

    } catch (error) {
      return Result.failure(new Error(`Failed to find sources needing attention: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findAll(options: FindSourcesOptions = {}): Promise<Result<SourcePage, Error>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.type) {
        // Handle both string and value object types
        where.type = typeof options.type === 'string' ? options.type : options.type.getValue();
      }
      if (options.status) {
        // Handle both string and value object statuses
        where.status = typeof options.status === 'string' ? options.status : options.status.getValue();
      }

      const orderBy: any = {};
      if (options.sortBy && options.sortOrder) {
        orderBy[options.sortBy] = options.sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      const [sources, total] = await Promise.all([
        this.prisma.source.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.source.count({ where }),
      ]);

      const domainSources = sources.map(source => this.toDomainSource(source));
      const totalPages = Math.ceil(total / limit);

      return Result.success({
        sources: domainSources,
        total,
        page,
        limit,
        totalPages,
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to find sources: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async findSummaries(options: FindSourcesOptions = {}): Promise<Result<SourceSummaryPage, Error>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.type) {
        // Handle both string and value object types
        where.type = typeof options.type === 'string' ? options.type : options.type.getValue();
      }
      if (options.status) {
        // Handle both string and value object statuses
        where.status = typeof options.status === 'string' ? options.status : options.status.getValue();
      }

      const orderBy: any = {};
      if (options.sortBy && options.sortOrder) {
        orderBy[options.sortBy] = options.sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }

      const [sources, total] = await Promise.all([
        this.prisma.source.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            url: true,
            configuration: true,
            lastFetchAt: true,
            lastErrorAt: true,
            lastError: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.source.count({ where }),
      ]);

      const summaries: SourceSummary[] = sources.map(source => ({
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        url: source.url || undefined,
        configuration: source.configuration as any,
        lastFetchAt: source.lastFetchAt,
        lastErrorAt: source.lastErrorAt,
        lastError: source.lastError || undefined,
        needsAttention: this.sourceNeedsAttention(source),
        totalFetches: (source.metadata as any)?.totalFetches || 0,
        totalItems: (source.metadata as any)?.totalItems || 0,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      }));

      const totalPages = Math.ceil(total / limit);

      return Result.success({
        sources: summaries,
        total,
        page,
        limit,
        totalPages,
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to find source summaries: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async search(query: string, options: FindSourcesOptions = {}): Promise<Result<Source[], Error>> {
    try {
      const where: any = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { url: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (options.type) {
        // Handle both string and value object types
        where.type = typeof options.type === 'string' ? options.type : options.type.getValue();
      }
      if (options.status) {
        // Handle both string and value object statuses
        where.status = typeof options.status === 'string' ? options.status : options.status.getValue();
      }

      const limit = options.limit || 50;
      const orderBy: any = {};
      if (options.sortBy && options.sortOrder) {
        orderBy[options.sortBy] = options.sortOrder;
      } else {
        orderBy.name = 'asc';
      }

      const sources = await this.prisma.source.findMany({
        where,
        orderBy,
        take: limit,
      });

      const domainSources = sources.map(source => this.toDomainSource(source));
      return Result.success(domainSources);

    } catch (error) {
      return Result.failure(new Error(`Failed to search sources: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async existsByTypeAndUrl(type: SourceType, url: string): Promise<Result<boolean, Error>> {
    try {
      const count = await this.prisma.source.count({
        where: {
          type: type.getValue(),
          url: url,
        },
      });

      return Result.success(count > 0);

    } catch (error) {
      return Result.failure(new Error(`Failed to check source existence: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async delete(id: SourceId): Promise<Result<void, Error>> {
    try {
      await this.prisma.source.delete({
        where: { id: id.getValue() },
      });

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(new Error(`Failed to delete source: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async updateLastFetch(id: SourceId, fetchTime: Date): Promise<Result<void, Error>> {
    try {
      await this.prisma.source.update({
        where: { id: id.getValue() },
        data: {
          lastFetchAt: fetchTime,
          updatedAt: new Date(),
        },
      });

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(new Error(`Failed to update last fetch time: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async bulkUpdateStatus(ids: SourceId[], status: SourceStatus): Promise<Result<number, Error>> {
    try {
      const result = await this.prisma.source.updateMany({
        where: {
          id: { in: ids.map(id => id.getValue()) },
        },
        data: {
          status: status.getValue(),
          updatedAt: new Date(),
        },
      });

      return Result.success(result.count);

    } catch (error) {
      return Result.failure(new Error(`Failed to bulk update status: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async getStatistics(): Promise<Result<SourceStatistics, Error>> {
    try {
      const [total, byType, byStatus, aggregates] = await Promise.all([
        this.prisma.source.count(),
        this.prisma.source.groupBy({
          by: ['type'],
          _count: true,
        }),
        this.prisma.source.groupBy({
          by: ['status'],
          _count: true,
        }),
        this.prisma.source.aggregate({
          _sum: {
            // Note: These would need to be extracted from metadata JSON
          },
          _max: {
            lastFetchAt: true,
          },
        }),
      ]);

      const typeStats: Record<string, number> = {};
      byType.forEach(item => {
        typeStats[item.type] = item._count;
      });

      const statusStats: Record<string, number> = {};
      byStatus.forEach(item => {
        statusStats[item.status] = item._count;
      });

      // For metadata aggregation, we'd need a more complex query
      // This is a simplified version
      const statistics: SourceStatistics = {
        total,
        byType: typeStats,
        byStatus: statusStats,
        totalFetches: 0, // Would need to calculate from metadata
        totalItems: 0,   // Would need to calculate from metadata
        totalErrors: 0,  // Would need to calculate from metadata
        lastFetchAt: aggregates._max.lastFetchAt || undefined,
      };

      return Result.success(statistics);

    } catch (error) {
      return Result.failure(new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  private toDomainSource(prismaSource: any): Source {
    const id = SourceId.fromString(prismaSource.id);
    const name = SourceName.fromString(prismaSource.name);
    const type = SourceType.fromString(prismaSource.type);
    const status = SourceStatus.fromString(prismaSource.status);
    const url = prismaSource.url ? SourceUrl.fromString(prismaSource.url) : undefined;
    const configuration = prismaSource.configuration as SourceConfiguration;
    const metadata = prismaSource.metadata as SourceMetadata;

    return new Source(
      id,
      name,
      type,
      status,
      url,
      prismaSource.defaultCategory,
      configuration,
      metadata,
      prismaSource.lastFetchAt,
      prismaSource.lastErrorAt,
      prismaSource.lastError,
      prismaSource.createdAt,
      prismaSource.updatedAt
    );
  }

  private sourceNeedsAttention(source: any): boolean {
    if (source.status === 'error') {
      return true;
    }

    // Check if not fetched recently (simplified check)
    if (source.status === 'active' && source.lastFetchAt) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return source.lastFetchAt < oneDayAgo;
    }

    return source.status === 'active' && !source.lastFetchAt;
  }
}