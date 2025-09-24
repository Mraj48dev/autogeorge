import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { SourceRepository } from '../repositories/SourceRepository';
import { Logger } from '../../infrastructure/logger/Logger';
import { SourceName } from '../../domain/value-objects/SourceName';
import { SourceUrl } from '../../domain/value-objects/SourceUrl';
import { SourceId } from '../../domain/value-objects/SourceId';
import { SourceConfiguration } from '../../domain/entities/Source';

export interface UpdateSourceRequest {
  sourceId: string;
  name?: string;
  url?: string;
  defaultCategory?: string;
  configuration?: SourceConfiguration;
  metadata?: Record<string, any>;
}

export interface UpdateSourceResponse {
  source: any;
  message: string;
}

/**
 * Updates an existing source
 */
export class UpdateSource implements UseCase<UpdateSourceRequest, UpdateSourceResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly logger: Logger
  ) {}

  async execute(request: UpdateSourceRequest): Promise<Result<UpdateSourceResponse, Error>> {
    try {
      this.logger.info('Updating source', {
        sourceId: request.sourceId,
        requestData: {
          name: request.name,
          url: request.url,
          configuration: request.configuration,
          hasAutoGenerate: request.configuration?.autoGenerate,
          configurationKeys: request.configuration ? Object.keys(request.configuration) : []
        }
      });

      // Get existing source
      const sourceId = SourceId.fromString(request.sourceId);
      const sourceResult = await this.sourceRepository.findById(sourceId);

      if (sourceResult.isFailure()) {
        return Result.failure(sourceResult.error);
      }

      const existingSource = sourceResult.value;
      if (!existingSource) {
        return Result.failure(new Error(`Source with ID ${request.sourceId} not found`));
      }

      // Update source fields
      if (request.name) {
        try {
          const sourceName = SourceName.fromString(request.name);
          existingSource.updateName(sourceName);
        } catch (error) {
          return Result.failure(error instanceof Error ? error : new Error('Invalid source name'));
        }
      }

      if (request.url && existingSource.type.requiresUrl()) {
        try {
          const sourceUrl = SourceUrl.fromString(request.url);
          existingSource.updateUrl(sourceUrl);
        } catch (error) {
          return Result.failure(error instanceof Error ? error : new Error('Invalid source URL'));
        }
      }

      if (request.configuration) {
        this.logger.info('Updating source configuration', {
          sourceId: request.sourceId,
          oldConfiguration: existingSource.configuration,
          newConfiguration: request.configuration,
          autoGenerateOld: existingSource.configuration?.autoGenerate,
          autoGenerateNew: request.configuration?.autoGenerate
        });
        existingSource.updateConfiguration(request.configuration);
        this.logger.info('Source configuration updated', {
          sourceId: request.sourceId,
          updatedConfiguration: existingSource.configuration,
          autoGenerateAfterUpdate: existingSource.configuration?.autoGenerate
        });
      }

      if ('defaultCategory' in request) {
        existingSource.updateDefaultCategory(request.defaultCategory);
      }

      // Save updated source
      const saveResult = await this.sourceRepository.save(existingSource);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.error);
      }

      this.logger.info('Source updated successfully', {
        sourceId: request.sourceId,
        name: request.name
      });

      return Result.success({
        source: existingSource.toJSON(),
        message: `Source "${existingSource.name.getValue()}" updated successfully`
      });

    } catch (error) {
      this.logger.error('Error updating source', { error, request });
      return Result.failure(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }
}