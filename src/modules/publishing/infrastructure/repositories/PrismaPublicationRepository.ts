import { Result } from '../../../shared/domain/types/Result';
import { Publication, PublicationMetadata, PublicationError } from '../../domain/entities/Publication';
import { PublicationId } from '../../domain/value-objects/PublicationId';
import { PublicationStatus } from '../../domain/value-objects/PublicationStatus';
import { PublicationTarget } from '../../domain/value-objects/PublicationTarget';
import {
  PublicationRepository,
  RepositoryError,
  PublicationStatistics
} from '../../domain/ports/PublicationRepository';
import { prisma } from '../../../../shared/database/prisma';

/**
 * Prisma implementation of PublicationRepository.
 *
 * This adapter handles all database operations for publications
 * using Prisma ORM with PostgreSQL.
 */
export class PrismaPublicationRepository implements PublicationRepository {
  /**
   * Saves a publication to the database
   */
  async save(publication: Publication): Promise<Result<void, RepositoryError>> {
    try {
      const data = this.toPrismaData(publication);

      await prisma.publication.upsert({
        where: { id: publication.id.getValue() },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: data
      });

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds a publication by its ID
   */
  async findById(id: PublicationId): Promise<Result<Publication | null, RepositoryError>> {
    try {
      const record = await prisma.publication.findUnique({
        where: { id: id.getValue() }
      });

      if (!record) {
        return Result.success(null);
      }

      const publication = this.toDomainEntity(record);
      return Result.success(publication);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds publications by article ID
   */
  async findByArticleId(articleId: string): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: { articleId },
        orderBy: { createdAt: 'desc' }
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds publications by status
   */
  async findByStatus(status: PublicationStatus): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: { status: status.getValue() },
        orderBy: { createdAt: 'desc' }
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds publications ready for execution
   */
  async findReadyForExecution(): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: {
          OR: [
            { status: 'pending' },
            {
              status: 'scheduled',
              scheduledAt: {
                lte: new Date()
              }
            }
          ]
        },
        orderBy: [
          { scheduledAt: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds publications by target platform
   */
  async findByPlatform(platform: string): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: {
          target: {
            path: ['platform'],
            equals: platform
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds publications created within a date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Finds failed publications that can be retried
   */
  async findRetryable(): Promise<Result<Publication[], RepositoryError>> {
    try {
      const records = await prisma.publication.findMany({
        where: {
          status: 'failed',
          retryCount: {
            lt: prisma.publication.fields.maxRetries
          }
        },
        orderBy: { updatedAt: 'asc' }
      });

      const publications = records.map(record => this.toDomainEntity(record));
      return Result.success(publications.filter(pub => pub.canRetry()));
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Deletes a publication by its ID
   */
  async delete(id: PublicationId): Promise<Result<void, RepositoryError>> {
    try {
      await prisma.publication.delete({
        where: { id: id.getValue() }
      });

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Checks if a publication exists for the given article and target
   */
  async existsForArticleAndTarget(
    articleId: string,
    platform: string,
    siteId: string
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const count = await prisma.publication.count({
        where: {
          articleId,
          target: {
            path: ['platform'],
            equals: platform
          },
          target: {
            path: ['siteId'],
            equals: siteId
          },
          status: {
            not: 'cancelled'
          }
        }
      });

      return Result.success(count > 0);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Gets publication statistics
   */
  async getStatistics(): Promise<Result<PublicationStatistics, RepositoryError>> {
    try {
      const [total, statusCounts, platformCounts, recentStats] = await Promise.all([
        prisma.publication.count(),
        prisma.publication.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.publication.groupBy({
          by: ['target'],
          _count: true
        }),
        prisma.publication.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          select: {
            status: true,
            startedAt: true,
            completedAt: true
          }
        })
      ]);

      const byStatus = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>);

      const byPlatform = platformCounts.reduce((acc, item) => {
        const platform = (item.target as any)?.platform || 'unknown';
        acc[platform] = (acc[platform] || 0) + item._count;
        return acc;
      }, {} as Record<string, number>);

      const successful = byStatus.completed || 0;
      const failed = byStatus.failed || 0;
      const successRate = total > 0 ? successful / total : 0;

      const durations = recentStats
        .filter(p => p.startedAt && p.completedAt)
        .map(p => p.completedAt!.getTime() - p.startedAt!.getTime());
      
      const averageDuration = durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

      const last24Hours = {
        total: recentStats.length,
        successful: recentStats.filter(p => p.status === 'completed').length,
        failed: recentStats.filter(p => p.status === 'failed').length
      };

      const statistics: PublicationStatistics = {
        total,
        byStatus,
        byPlatform,
        successRate,
        averageDuration,
        totalRetries: 0, // Would need additional query to calculate
        last24Hours
      };

      return Result.success(statistics);
    } catch (error) {
      return Result.failure(this.mapError(error));
    }
  }

  /**
   * Converts domain entity to Prisma data
   */
  private toPrismaData(publication: Publication): any {
    return {
      id: publication.id.getValue(),
      articleId: publication.articleId,
      target: publication.target.toJSON(),
      status: publication.status.getValue(),
      externalId: publication.externalId,
      externalUrl: publication.externalUrl,
      metadata: publication.metadata,
      error: publication.error,
      retryCount: publication.retryCount,
      maxRetries: publication.maxRetries,
      scheduledAt: publication.scheduledAt,
      startedAt: publication.startedAt,
      completedAt: publication.completedAt,
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt
    };
  }

  /**
   * Converts Prisma record to domain entity
   */
  private toDomainEntity(record: any): Publication {
    const id = PublicationId.fromString(record.id);
    const target = PublicationTarget.fromValue(record.target);
    const status = PublicationStatus.fromString(record.status);
    
    const publication = new (Publication as any)(
      id,
      record.articleId,
      target,
      record.metadata,
      status,
      record.maxRetries,
      record.scheduledAt,
      record.createdAt,
      record.updatedAt
    );

    // Set private properties through reflection (this is a workaround for the constructor)
    if (record.externalId) {
      (publication as any)._externalId = record.externalId;
    }
    if (record.externalUrl) {
      (publication as any)._externalUrl = record.externalUrl;
    }
    if (record.error) {
      (publication as any)._error = record.error;
    }
    if (record.retryCount) {
      (publication as any)._retryCount = record.retryCount;
    }
    if (record.startedAt) {
      (publication as any)._startedAt = record.startedAt;
    }
    if (record.completedAt) {
      (publication as any)._completedAt = record.completedAt;
    }

    return publication;
  }

  /**
   * Maps database errors to repository errors
   */
  private mapError(error: any): RepositoryError {
    if (error.code === 'P2002') {
      return {
        code: 'CONSTRAINT_VIOLATION',
        message: 'A publication with this configuration already exists',
        details: { originalError: error }
      };
    }

    if (error.code === 'P2025') {
      return {
        code: 'NOT_FOUND',
        message: 'Publication not found',
        details: { originalError: error }
      };
    }

    if (error.name === 'PrismaClientKnownRequestError') {
      return {
        code: 'DATABASE_ERROR',
        message: `Database error: ${error.message}`,
        details: { originalError: error }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown repository error',
      details: { originalError: error }
    };
  }
}