import { Result } from '@/shared/utils/Result';
import { Site, SiteStatistics } from '../../domain/entities/Site';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export interface UserSiteInfo {
  site: Site;
  statistics: SiteStatistics;
}

export interface GetUserSitesResponse {
  sites: UserSiteInfo[];
  totalSites: number;
}

export class GetUserSites {
  constructor(
    private siteRepository: SiteRepository,
    private logger: Logger
  ) {}

  async execute(userId: string): Promise<Result<GetUserSitesResponse, Error>> {
    this.logger.info('GetUserSites: Fetching sites for user', { userId });

    try {
      // Get user sites
      const sitesResult = await this.siteRepository.findByUserId(userId);
      if (sitesResult.isFailure()) {
        this.logger.error('GetUserSites: Failed to fetch sites', { userId, error: sitesResult.error.message });
        return Result.failure(sitesResult.error);
      }

      const sites = sitesResult.data;

      // Get statistics for all sites
      const statisticsResult = await this.siteRepository.getAllStatistics(userId);
      if (statisticsResult.isFailure()) {
        this.logger.warn('GetUserSites: Failed to fetch statistics', { userId, error: statisticsResult.error.message });
        // Continue without statistics
        const sitesWithEmptyStats: UserSiteInfo[] = sites.map(site => ({
          site,
          statistics: {
            totalSources: 0,
            totalArticles: 0,
            articlesPublished: 0,
            articlesPending: 0,
            isPublishing: false
          }
        }));

        return Result.success({
          sites: sitesWithEmptyStats,
          totalSites: sites.length
        });
      }

      const statisticsMap = statisticsResult.data;

      // Combine sites with their statistics
      const sitesWithStats: UserSiteInfo[] = sites.map(site => ({
        site,
        statistics: statisticsMap.get(site.id) || {
          totalSources: 0,
          totalArticles: 0,
          articlesPublished: 0,
          articlesPending: 0,
          isPublishing: false
        }
      }));

      this.logger.info('GetUserSites: Successfully fetched sites', {
        userId,
        sitesCount: sites.length
      });

      return Result.success({
        sites: sitesWithStats,
        totalSites: sites.length
      });

    } catch (error) {
      this.logger.error('GetUserSites: Unexpected error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to get user sites due to unexpected error'));
    }
  }
}