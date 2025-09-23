import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { GenerationSettings, GenerationConfig } from '../../domain/entities/GenerationSettings';
import { GenerationSettingsRepository } from '../../domain/ports/GenerationSettingsRepository';
import { Logger } from '../../infrastructure/logger/Logger';

/**
 * Use case for retrieving user's generation settings
 */
export class GetGenerationSettings implements UseCase<GetGenerationSettingsRequest, GetGenerationSettingsResponse> {
  constructor(
    private readonly generationSettingsRepository: GenerationSettingsRepository,
    private readonly logger: Logger
  ) {}

  async execute(request: GetGenerationSettingsRequest): Promise<Result<GetGenerationSettingsResponse>> {
    try {
      this.logger.info('Retrieving generation settings', { userId: request.userId });

      const existingSettings = await this.generationSettingsRepository.findByUserId(request.userId);

      if (!existingSettings.isSuccess()) {
        return Result.failure(`Failed to retrieve settings: ${existingSettings.getError()}`);
      }

      const settings = existingSettings.getValue();

      if (!settings) {
        // Create default settings for user
        const createResult = GenerationSettings.create(request.userId);
        if (!createResult.isSuccess()) {
          return Result.failure(`Failed to create default settings: ${createResult.getError()}`);
        }

        const newSettings = createResult.getValue();
        const saveResult = await this.generationSettingsRepository.save(newSettings);

        if (!saveResult.isSuccess()) {
          return Result.failure(`Failed to save default settings: ${saveResult.getError()}`);
        }

        this.logger.info('Created default generation settings', { userId: request.userId });

        return Result.success({
          settings: newSettings.getGenerationConfig(),
          isDefault: true
        });
      }

      this.logger.info('Retrieved existing generation settings', { userId: request.userId });

      return Result.success({
        settings: settings.getGenerationConfig(),
        isDefault: false
      });

    } catch (error) {
      this.logger.error('Failed to get generation settings', { userId: request.userId, error });
      return Result.failure(`Failed to get generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export interface GetGenerationSettingsRequest {
  userId: string;
}

export interface GetGenerationSettingsResponse {
  settings: GenerationConfig;
  isDefault: boolean;
}