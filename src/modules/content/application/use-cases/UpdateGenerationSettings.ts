import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { GenerationSettings } from '../../domain/entities/GenerationSettings';
import { GenerationSettingsRepository } from '../../domain/ports/GenerationSettingsRepository';
import { Logger } from '../../infrastructure/logger/Logger';

/**
 * Use case for updating user's generation settings
 */
export class UpdateGenerationSettings implements UseCase<UpdateGenerationSettingsRequest, UpdateGenerationSettingsResponse> {
  constructor(
    private readonly generationSettingsRepository: GenerationSettingsRepository,
    private readonly logger: Logger
  ) {}

  async execute(request: UpdateGenerationSettingsRequest): Promise<Result<UpdateGenerationSettingsResponse>> {
    try {
      this.logger.info('Updating generation settings', { userId: request.userId });

      // Check if settings exist for user
      const existingSettings = await this.generationSettingsRepository.findByUserId(request.userId);

      if (!existingSettings.isSuccess()) {
        return Result.failure(`Failed to retrieve existing settings: ${existingSettings.getError()}`);
      }

      let settings = existingSettings.getValue();

      if (!settings) {
        // Create new settings if they don't exist
        const createResult = GenerationSettings.create(
          request.userId,
          request.titlePrompt,
          request.contentPrompt,
          request.seoPrompt
        );

        if (!createResult.isSuccess()) {
          return Result.failure(`Failed to create settings: ${createResult.getError()}`);
        }

        settings = createResult.getValue();

        // Apply additional updates if provided
        if (request.modelSettings) {
          settings.updateModelSettings(
            request.modelSettings.model,
            request.modelSettings.temperature,
            request.modelSettings.maxTokens
          );
        }

        if (request.languageSettings) {
          settings.updateLanguageSettings(
            request.languageSettings.language,
            request.languageSettings.tone,
            request.languageSettings.style,
            request.languageSettings.targetAudience
          );
        }

        const saveResult = await this.generationSettingsRepository.save(settings);
        if (!saveResult.isSuccess()) {
          return Result.failure(`Failed to save new settings: ${saveResult.getError()}`);
        }

        this.logger.info('Created new generation settings', { userId: request.userId });
      } else {
        // Update existing settings
        if (request.titlePrompt || request.contentPrompt || request.seoPrompt) {
          settings.updatePrompts(
            request.titlePrompt || settings.titlePrompt,
            request.contentPrompt || settings.contentPrompt,
            request.seoPrompt || settings.seoPrompt
          );
        }

        if (request.modelSettings) {
          settings.updateModelSettings(
            request.modelSettings.model || settings.defaultModel,
            request.modelSettings.temperature ?? settings.defaultTemperature,
            request.modelSettings.maxTokens || settings.defaultMaxTokens
          );
        }

        if (request.languageSettings) {
          settings.updateLanguageSettings(
            request.languageSettings.language || settings.defaultLanguage,
            request.languageSettings.tone || settings.defaultTone,
            request.languageSettings.style || settings.defaultStyle,
            request.languageSettings.targetAudience || settings.defaultTargetAudience
          );
        }

        const updateResult = await this.generationSettingsRepository.update(settings);
        if (!updateResult.isSuccess()) {
          return Result.failure(`Failed to update settings: ${updateResult.getError()}`);
        }

        this.logger.info('Updated generation settings', { userId: request.userId });
      }

      return Result.success({
        settings: settings.getGenerationConfig(),
        message: 'Settings updated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to update generation settings', { userId: request.userId, error });
      return Result.failure(`Failed to update generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export interface UpdateGenerationSettingsRequest {
  userId: string;
  titlePrompt?: string;
  contentPrompt?: string;
  seoPrompt?: string;
  modelSettings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  languageSettings?: {
    language?: string;
    tone?: string;
    style?: string;
    targetAudience?: string;
  };
}

export interface UpdateGenerationSettingsResponse {
  settings: any; // GenerationConfig from the entity
  message: string;
}