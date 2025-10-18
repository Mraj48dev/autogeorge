import { Result } from '@/shared/domain/types/Result';
import { Site } from '../../domain/entities/Site';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { WordPressConnectionService } from '../../domain/ports/WordPressConnectionService';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export interface CreateSiteRequest {
  userId: string;
  name: string;
  url: string;
  username: string;
  password: string;
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

export interface CreateSiteResponse {
  site: Site;
  connectionTest: {
    isReachable: boolean;
    isValid: boolean;
    warnings: string[];
  };
}

export class CreateSite {
  constructor(
    private siteRepository: SiteRepository,
    private wordpressService: WordPressConnectionService,
    private logger: Logger
  ) {}

  async execute(request: CreateSiteRequest): Promise<Result<CreateSiteResponse, Error>> {
    this.logger.info('CreateSite: Starting site creation', { userId: request.userId, name: request.name });

    try {
      // Create site entity
      const siteResult = Site.create({
        userId: request.userId,
        name: request.name,
        url: request.url,
        username: request.username,
        password: request.password,
        defaultCategory: request.defaultCategory,
        defaultStatus: request.defaultStatus || 'draft',
        defaultAuthor: request.defaultAuthor,
        enableAutoPublish: request.enableAutoPublish ?? false,
        enableFeaturedImage: request.enableFeaturedImage ?? true,
        enableTags: request.enableTags ?? true,
        enableCategories: request.enableCategories ?? true,
        customFields: request.customFields,
        isActive: true,
        enableAutoGeneration: request.enableAutoGeneration ?? false
      });

      if (siteResult.isFailure()) {
        this.logger.error('CreateSite: Site creation failed', { error: siteResult.error.message });
        return Result.failure(siteResult.error);
      }

      const site = siteResult.data;

      // Test WordPress connection
      const connectionResult = await this.wordpressService.testConnection(site);
      if (connectionResult.isFailure()) {
        this.logger.warn('CreateSite: WordPress connection test failed', {
          siteId: site.id,
          error: connectionResult.error.message
        });
      }

      // Save to repository
      const saveResult = await this.siteRepository.save(site);
      if (saveResult.isFailure()) {
        this.logger.error('CreateSite: Failed to save site', { error: saveResult.error.message });
        return Result.failure(saveResult.error);
      }

      const connectionTest = connectionResult.isSuccess()
        ? connectionResult.data
        : { isReachable: false, isValid: false, warnings: ['Connection test failed'] };

      this.logger.info('CreateSite: Site created successfully', { siteId: site.id });

      return Result.success({
        site: saveResult.data,
        connectionTest: {
          isReachable: connectionTest.isReachable,
          isValid: connectionTest.isValid,
          warnings: connectionTest.warnings
        }
      });

    } catch (error) {
      this.logger.error('CreateSite: Unexpected error', { error: error instanceof Error ? error.message : 'Unknown error' });
      return Result.failure(new Error('Failed to create site due to unexpected error'));
    }
  }
}