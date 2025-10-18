import { Result } from '@/shared/domain/types/Result';
import { Site, SiteStatistics } from '../entities/Site';
import { SiteId } from '../value-objects/SiteId';

export interface SiteRepository {
  /**
   * Find site by ID
   */
  findById(siteId: SiteId): Promise<Result<Site | null, Error>>;

  /**
   * Find all sites for a user
   */
  findByUserId(userId: string): Promise<Result<Site[], Error>>;

  /**
   * Save a site (create or update)
   */
  save(site: Site): Promise<Result<Site, Error>>;

  /**
   * Delete a site
   */
  delete(siteId: SiteId): Promise<Result<void, Error>>;

  /**
   * Get site statistics
   */
  getStatistics(siteId: SiteId): Promise<Result<SiteStatistics, Error>>;

  /**
   * Get statistics for all user sites
   */
  getAllStatistics(userId: string): Promise<Result<Map<string, SiteStatistics>, Error>>;

  /**
   * Check if site exists for user
   */
  existsForUser(userId: string, siteId: SiteId): Promise<Result<boolean, Error>>;
}