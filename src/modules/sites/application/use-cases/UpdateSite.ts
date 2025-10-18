import { Result } from '@/shared/domain/types/Result';
import { Site } from '../../domain/entities/Site';
import { SiteId } from '../../domain/value-objects/SiteId';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { WordPressConnectionService } from '../../domain/ports/WordPressConnectionService';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export interface UpdateSiteRequest {
  siteId: string;
  userId: string;
  name?: string;
  url?: string;
  username?: string;
  password?: string;
  defaultCategory?: string;
  defaultStatus?: string;
  defaultAuthor?: string;
  enableAutoPublish?: boolean;
  enableFeaturedImage?: boolean;
  enableTags?: boolean;
  enableCategories?: boolean;
  customFields?: Record<string, any>;
  enableAutoGeneration?: boolean;
}

export interface UpdateSiteResponse {
  site: Site;
  connectionTest?: {
    isReachable: boolean;
    isValid: boolean;
    warnings: string[];
  };
}

export class UpdateSite {
  constructor(
    private siteRepository: SiteRepository,
    private wordpressService: WordPressConnectionService,
    private logger: Logger
  ) {}

  async execute(request: UpdateSiteRequest): Promise<Result<UpdateSiteResponse, Error>> {
    this.logger.info('UpdateSite: Starting site update', {
      siteId: request.siteId,
      userId: request.userId
    });

    try {
      const siteId = SiteId.create(request.siteId);

      // Get existing site
      const siteResult = await this.siteRepository.findById(siteId);
      if (siteResult.isFailure()) {
        this.logger.error('UpdateSite: Failed to find site', {
          siteId: request.siteId,
          error: siteResult.error.message
        });
        return Result.failure(siteResult.error);
      }

      if (!siteResult.data) {
        this.logger.warn('UpdateSite: Site not found', { siteId: request.siteId });
        return Result.failure(new Error('Site not found'));
      }

      const existingSite = siteResult.data;

      // Verify ownership
      if (existingSite.userId !== request.userId) {
        this.logger.warn('UpdateSite: Access denied', {
          siteId: request.siteId,
          userId: request.userId
        });
        return Result.failure(new Error('Access denied'));
      }

      // Update site
      const updates = {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.url !== undefined && { url: request.url }),
        ...(request.username !== undefined && { username: request.username }),
        ...(request.password !== undefined && { password: request.password }),
        ...(request.defaultCategory !== undefined && { defaultCategory: request.defaultCategory }),
        ...(request.defaultStatus !== undefined && { defaultStatus: request.defaultStatus }),
        ...(request.defaultAuthor !== undefined && { defaultAuthor: request.defaultAuthor }),
        ...(request.enableAutoPublish !== undefined && { enableAutoPublish: request.enableAutoPublish }),
        ...(request.enableFeaturedImage !== undefined && { enableFeaturedImage: request.enableFeaturedImage }),
        ...(request.enableTags !== undefined && { enableTags: request.enableTags }),
        ...(request.enableCategories !== undefined && { enableCategories: request.enableCategories }),
        ...(request.customFields !== undefined && { customFields: request.customFields }),
        ...(request.enableAutoGeneration !== undefined && { enableAutoGeneration: request.enableAutoGeneration }),
      };

      const updatedSiteResult = existingSite.updateConfiguration(updates);
      if (updatedSiteResult.isFailure()) {
        this.logger.error('UpdateSite: Site update validation failed', {
          siteId: request.siteId,
          error: updatedSiteResult.error.message
        });
        return Result.failure(updatedSiteResult.error);
      }

      const updatedSite = updatedSiteResult.data;

      // Test connection if URL/credentials changed
      let connectionTest: any = undefined;
      const credentialsChanged = request.url || request.username || request.password;
      if (credentialsChanged) {
        const connectionResult = await this.wordpressService.testConnection(updatedSite);
        if (connectionResult.isSuccess()) {
          connectionTest = {
            isReachable: connectionResult.data.isReachable,
            isValid: connectionResult.data.isValid,
            warnings: connectionResult.data.warnings
          };
        } else {
          connectionTest = {
            isReachable: false,
            isValid: false,
            warnings: ['Connection test failed']
          };
        }
      }

      // Save updated site
      const saveResult = await this.siteRepository.save(updatedSite);
      if (saveResult.isFailure()) {
        this.logger.error('UpdateSite: Failed to save updated site', {
          siteId: request.siteId,
          error: saveResult.error.message
        });
        return Result.failure(saveResult.error);
      }

      this.logger.info('UpdateSite: Site updated successfully', {
        siteId: request.siteId,
        userId: request.userId
      });

      return Result.success({
        site: saveResult.data,
        connectionTest
      });

    } catch (error) {
      this.logger.error('UpdateSite: Unexpected error', {
        siteId: request.siteId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to update site due to unexpected error'));
    }
  }
}