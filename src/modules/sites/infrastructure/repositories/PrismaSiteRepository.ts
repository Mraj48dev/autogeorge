import { Result } from '@/shared/utils/Result';
import { Site, SiteStatistics } from '../../domain/entities/Site';
import { SiteId } from '../../domain/value-objects/SiteId';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { prisma } from '@/shared/database/prisma';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export class PrismaSiteRepository implements SiteRepository {
  constructor(private logger: Logger) {}

  async findById(siteId: SiteId): Promise<Result<Site | null, Error>> {
    try {
      const siteData = await prisma.wordPressSite.findUnique({
        where: { id: siteId.getValue() }
      });

      if (!siteData) {
        return Result.success(null);
      }

      const site = Site.fromPersistence({
        id: siteData.id,
        userId: siteData.userId,
        name: siteData.name,
        url: siteData.url,
        username: siteData.username,
        password: siteData.password,
        defaultCategory: siteData.defaultCategory || undefined,
        defaultStatus: siteData.defaultStatus,
        defaultAuthor: siteData.defaultAuthor || undefined,
        enableAutoPublish: siteData.enableAutoPublish,
        enableFeaturedImage: siteData.enableFeaturedImage,
        enableTags: siteData.enableTags,
        enableCategories: siteData.enableCategories,
        customFields: (siteData.customFields as Record<string, any>) || undefined,
        isActive: siteData.isActive,
        lastPublishAt: siteData.lastPublishAt || undefined,
        lastError: siteData.lastError || undefined,
        createdAt: siteData.createdAt,
        updatedAt: siteData.updatedAt,
        enableAutoGeneration: siteData.enableAutoGeneration
      });

      return Result.success(site);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error finding site by ID', {
        siteId: siteId.getValue(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to find site'));
    }
  }

  async findByUserId(userId: string): Promise<Result<Site[], Error>> {
    try {
      const sitesData = await prisma.wordPressSite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      const sites = sitesData.map(siteData => Site.fromPersistence({
        id: siteData.id,
        userId: siteData.userId,
        name: siteData.name,
        url: siteData.url,
        username: siteData.username,
        password: siteData.password,
        defaultCategory: siteData.defaultCategory || undefined,
        defaultStatus: siteData.defaultStatus,
        defaultAuthor: siteData.defaultAuthor || undefined,
        enableAutoPublish: siteData.enableAutoPublish,
        enableFeaturedImage: siteData.enableFeaturedImage,
        enableTags: siteData.enableTags,
        enableCategories: siteData.enableCategories,
        customFields: (siteData.customFields as Record<string, any>) || undefined,
        isActive: siteData.isActive,
        lastPublishAt: siteData.lastPublishAt || undefined,
        lastError: siteData.lastError || undefined,
        createdAt: siteData.createdAt,
        updatedAt: siteData.updatedAt,
        enableAutoGeneration: siteData.enableAutoGeneration
      }));

      return Result.success(sites);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error finding sites by user ID', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to find user sites'));
    }
  }

  async save(site: Site): Promise<Result<Site, Error>> {
    try {
      const siteProps = site.toPlainObject();

      const savedData = await prisma.wordPressSite.upsert({
        where: { id: siteProps.id },
        update: {
          name: siteProps.name,
          url: siteProps.url,
          username: siteProps.username,
          password: siteProps.password,
          defaultCategory: siteProps.defaultCategory,
          defaultStatus: siteProps.defaultStatus,
          defaultAuthor: siteProps.defaultAuthor,
          enableAutoPublish: siteProps.enableAutoPublish,
          enableFeaturedImage: siteProps.enableFeaturedImage,
          enableTags: siteProps.enableTags,
          enableCategories: siteProps.enableCategories,
          customFields: siteProps.customFields,
          isActive: siteProps.isActive,
          lastPublishAt: siteProps.lastPublishAt,
          lastError: siteProps.lastError,
          enableAutoGeneration: siteProps.enableAutoGeneration,
          updatedAt: siteProps.updatedAt
        },
        create: {
          id: siteProps.id,
          userId: siteProps.userId,
          name: siteProps.name,
          url: siteProps.url,
          username: siteProps.username,
          password: siteProps.password,
          defaultCategory: siteProps.defaultCategory,
          defaultStatus: siteProps.defaultStatus,
          defaultAuthor: siteProps.defaultAuthor,
          enableAutoPublish: siteProps.enableAutoPublish,
          enableFeaturedImage: siteProps.enableFeaturedImage,
          enableTags: siteProps.enableTags,
          enableCategories: siteProps.enableCategories,
          customFields: siteProps.customFields,
          isActive: siteProps.isActive,
          lastPublishAt: siteProps.lastPublishAt,
          lastError: siteProps.lastError,
          enableAutoGeneration: siteProps.enableAutoGeneration,
          createdAt: siteProps.createdAt,
          updatedAt: siteProps.updatedAt
        }
      });

      const savedSite = Site.fromPersistence({
        ...siteProps,
        createdAt: savedData.createdAt,
        updatedAt: savedData.updatedAt
      });

      return Result.success(savedSite);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error saving site', {
        siteId: site.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to save site'));
    }
  }

  async delete(siteId: SiteId): Promise<Result<void, Error>> {
    try {
      await prisma.wordPressSite.delete({
        where: { id: siteId.getValue() }
      });

      return Result.success(undefined);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error deleting site', {
        siteId: siteId.getValue(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to delete site'));
    }
  }

  async getStatistics(siteId: SiteId): Promise<Result<SiteStatistics, Error>> {
    try {
      const [articlesCount, sourcesCount, publishedCount, pendingCount] = await Promise.all([
        prisma.article.count({
          where: { wordpressSiteId: siteId.getValue() }
        }),
        prisma.source.count({
          where: {
            articles: {
              some: { wordpressSiteId: siteId.getValue() }
            }
          }
        }),
        prisma.article.count({
          where: {
            wordpressSiteId: siteId.getValue(),
            status: 'published'
          }
        }),
        prisma.article.count({
          where: {
            wordpressSiteId: siteId.getValue(),
            status: { in: ['generated', 'pending'] }
          }
        })
      ]);

      // Check if currently publishing (simplified - could be more sophisticated)
      const recentPublishing = await prisma.article.findFirst({
        where: {
          wordpressSiteId: siteId.getValue(),
          status: 'publishing',
          updatedAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
          }
        }
      });

      const statistics: SiteStatistics = {
        totalSources: sourcesCount,
        totalArticles: articlesCount,
        articlesPublished: publishedCount,
        articlesPending: pendingCount,
        isPublishing: !!recentPublishing
      };

      return Result.success(statistics);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error getting site statistics', {
        siteId: siteId.getValue(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to get site statistics'));
    }
  }

  async getAllStatistics(userId: string): Promise<Result<Map<string, SiteStatistics>, Error>> {
    try {
      const sites = await prisma.wordPressSite.findMany({
        where: { userId },
        select: { id: true }
      });

      const statisticsMap = new Map<string, SiteStatistics>();

      for (const site of sites) {
        const statsResult = await this.getStatistics(SiteId.create(site.id));
        if (statsResult.isSuccess()) {
          statisticsMap.set(site.id, statsResult.data);
        }
      }

      return Result.success(statisticsMap);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error getting all statistics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to get sites statistics'));
    }
  }

  async existsForUser(userId: string, siteId: SiteId): Promise<Result<boolean, Error>> {
    try {
      const count = await prisma.wordPressSite.count({
        where: {
          id: siteId.getValue(),
          userId
        }
      });

      return Result.success(count > 0);
    } catch (error) {
      this.logger.error('PrismaSiteRepository: Error checking site existence', {
        userId,
        siteId: siteId.getValue(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to check site existence'));
    }
  }
}