import { Result } from '@/shared/domain/types/Result';
import { CreateSite, CreateSiteRequest, CreateSiteResponse } from '../application/use-cases/CreateSite';
import { GetUserSites, GetUserSitesResponse } from '../application/use-cases/GetUserSites';
import { UpdateSite, UpdateSiteRequest, UpdateSiteResponse } from '../application/use-cases/UpdateSite';
import { DeleteSite, DeleteSiteRequest } from '../application/use-cases/DeleteSite';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

/**
 * Sites Admin Facade
 *
 * Provides high-level operations for site management through a unified interface.
 * Used by admin controllers, CLI tools, and testing utilities.
 */
export class SitesAdminFacade {
  constructor(
    private createSiteUseCase: CreateSite,
    private getUserSitesUseCase: GetUserSites,
    private updateSiteUseCase: UpdateSite,
    private deleteSiteUseCase: DeleteSite,
    private logger: Logger
  ) {}

  /**
   * Create a new site for a user
   */
  async createSite(request: CreateSiteRequest): Promise<Result<CreateSiteResponse, Error>> {
    this.logger.info('SitesAdminFacade: Creating site', {
      userId: request.userId,
      name: request.name,
      url: request.url
    });

    return await this.createSiteUseCase.execute(request);
  }

  /**
   * Get all sites for a user with statistics
   */
  async getUserSites(userId: string): Promise<Result<GetUserSitesResponse, Error>> {
    this.logger.info('SitesAdminFacade: Getting user sites', { userId });

    return await this.getUserSitesUseCase.execute(userId);
  }

  /**
   * Update an existing site
   */
  async updateSite(request: UpdateSiteRequest): Promise<Result<UpdateSiteResponse, Error>> {
    this.logger.info('SitesAdminFacade: Updating site', {
      siteId: request.siteId,
      userId: request.userId
    });

    return await this.updateSiteUseCase.execute(request);
  }

  /**
   * Delete a site
   */
  async deleteSite(request: DeleteSiteRequest): Promise<Result<void, Error>> {
    this.logger.info('SitesAdminFacade: Deleting site', {
      siteId: request.siteId,
      userId: request.userId
    });

    return await this.deleteSiteUseCase.execute(request);
  }

  /**
   * Quick site creation for testing/demo purposes
   */
  async createQuickSite(
    userId: string,
    name: string,
    url: string,
    username: string,
    password: string
  ): Promise<Result<CreateSiteResponse, Error>> {
    return await this.createSite({
      userId,
      name,
      url,
      username,
      password,
      defaultStatus: 'draft',
      enableAutoPublish: false,
      enableFeaturedImage: true,
      enableTags: true,
      enableCategories: true,
      enableAutoGeneration: false
    });
  }

  /**
   * Get site count for a user
   */
  async getSiteCount(userId: string): Promise<Result<number, Error>> {
    const sitesResult = await this.getUserSites(userId);
    if (sitesResult.isFailure()) {
      return Result.failure(sitesResult.error);
    }

    return Result.success(sitesResult.data.totalSites);
  }

  /**
   * Batch operations for multiple sites
   */
  async deleteSites(userId: string, siteIds: string[]): Promise<Result<{ deleted: string[], failed: string[] }, Error>> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const siteId of siteIds) {
      const result = await this.deleteSite({ siteId, userId });
      if (result.isSuccess()) {
        deleted.push(siteId);
      } else {
        failed.push(siteId);
        this.logger.warn('SitesAdminFacade: Failed to delete site in batch', {
          siteId,
          userId,
          error: result.error.message
        });
      }
    }

    return Result.success({ deleted, failed });
  }

  /**
   * Enable/disable auto-generation for a site
   */
  async toggleAutoGeneration(userId: string, siteId: string, enabled: boolean): Promise<Result<UpdateSiteResponse, Error>> {
    return await this.updateSite({
      siteId,
      userId,
      enableAutoGeneration: enabled
    });
  }

  /**
   * Enable/disable auto-publishing for a site
   */
  async toggleAutoPublishing(userId: string, siteId: string, enabled: boolean): Promise<Result<UpdateSiteResponse, Error>> {
    return await this.updateSite({
      siteId,
      userId,
      enableAutoPublish: enabled
    });
  }

  /**
   * Health check - verify all sites for a user
   */
  async healthCheck(userId: string): Promise<Result<{
    totalSites: number;
    healthySites: number;
    unhealthySites: number;
    sitesWithErrors: Array<{ siteId: string; name: string; error: string }>;
  }, Error>> {
    const sitesResult = await this.getUserSites(userId);
    if (sitesResult.isFailure()) {
      return Result.failure(sitesResult.error);
    }

    const sites = sitesResult.data.sites;
    const totalSites = sites.length;
    const sitesWithErrors: Array<{ siteId: string; name: string; error: string }> = [];

    for (const siteInfo of sites) {
      if (siteInfo.site.lastError) {
        sitesWithErrors.push({
          siteId: siteInfo.site.id,
          name: siteInfo.site.name,
          error: siteInfo.site.lastError
        });
      }
    }

    const unhealthySites = sitesWithErrors.length;
    const healthySites = totalSites - unhealthySites;

    return Result.success({
      totalSites,
      healthySites,
      unhealthySites,
      sitesWithErrors
    });
  }

  /**
   * Get summary statistics across all user sites
   */
  async getSummaryStatistics(userId: string): Promise<Result<{
    totalSites: number;
    totalSources: number;
    totalArticles: number;
    totalPublished: number;
    sitesPublishing: number;
  }, Error>> {
    const sitesResult = await this.getUserSites(userId);
    if (sitesResult.isFailure()) {
      return Result.failure(sitesResult.error);
    }

    const sites = sitesResult.data.sites;

    const summary = sites.reduce((acc, siteInfo) => ({
      totalSites: acc.totalSites + 1,
      totalSources: acc.totalSources + siteInfo.statistics.totalSources,
      totalArticles: acc.totalArticles + siteInfo.statistics.totalArticles,
      totalPublished: acc.totalPublished + siteInfo.statistics.articlesPublished,
      sitesPublishing: acc.sitesPublishing + (siteInfo.statistics.isPublishing ? 1 : 0)
    }), {
      totalSites: 0,
      totalSources: 0,
      totalArticles: 0,
      totalPublished: 0,
      sitesPublishing: 0
    });

    return Result.success(summary);
  }
}