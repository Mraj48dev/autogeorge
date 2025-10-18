import { Result } from '@/shared/domain/types/Result';
import { SiteId } from '../../domain/value-objects/SiteId';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export interface DeleteSiteRequest {
  siteId: string;
  userId: string;
}

export class DeleteSite {
  constructor(
    private siteRepository: SiteRepository,
    private logger: Logger
  ) {}

  async execute(request: DeleteSiteRequest): Promise<Result<void, Error>> {
    this.logger.info('DeleteSite: Starting site deletion', {
      siteId: request.siteId,
      userId: request.userId
    });

    try {
      const siteId = SiteId.create(request.siteId);

      // Verify site belongs to user
      const existsResult = await this.siteRepository.existsForUser(request.userId, siteId);
      if (existsResult.isFailure()) {
        this.logger.error('DeleteSite: Failed to verify site ownership', {
          siteId: request.siteId,
          error: existsResult.error.message
        });
        return Result.failure(existsResult.error);
      }

      if (!existsResult.data) {
        this.logger.warn('DeleteSite: Site not found or does not belong to user', {
          siteId: request.siteId,
          userId: request.userId
        });
        return Result.failure(new Error('Site not found or access denied'));
      }

      // Delete the site
      const deleteResult = await this.siteRepository.delete(siteId);
      if (deleteResult.isFailure()) {
        this.logger.error('DeleteSite: Failed to delete site', {
          siteId: request.siteId,
          error: deleteResult.error.message
        });
        return Result.failure(deleteResult.error);
      }

      this.logger.info('DeleteSite: Site deleted successfully', {
        siteId: request.siteId,
        userId: request.userId
      });

      return Result.success(undefined);

    } catch (error) {
      this.logger.error('DeleteSite: Unexpected error', {
        siteId: request.siteId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to delete site due to unexpected error'));
    }
  }
}