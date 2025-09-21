import { UseCase } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { SourceRepository } from '../repositories/SourceRepository';
import { Logger } from '../../infrastructure/logger/Logger';
import { SourceId } from '../../domain/value-objects/SourceId';

export interface UpdateSourceStatusRequest {
  sourceId: string;
  status: 'active' | 'paused' | 'archived';
}

export interface UpdateSourceStatusResponse {
  source: any;
  message: string;
}

/**
 * Updates the status of an existing source
 */
export class UpdateSourceStatus implements UseCase<UpdateSourceStatusRequest, UpdateSourceStatusResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly logger: Logger
  ) {}

  async execute(request: UpdateSourceStatusRequest): Promise<Result<UpdateSourceStatusResponse, Error>> {
    try {
      this.logger.info('Updating source status', {
        sourceId: request.sourceId,
        status: request.status
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

      // Update status based on requested action
      switch (request.status) {
        case 'active':
          existingSource.activate();
          break;
        case 'paused':
          existingSource.pause();
          break;
        case 'archived':
          existingSource.archive();
          break;
        default:
          return Result.failure(new Error(`Invalid status: ${request.status}`));
      }

      // Save updated source
      const saveResult = await this.sourceRepository.save(existingSource);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.error);
      }

      this.logger.info('Source status updated successfully', {
        sourceId: request.sourceId,
        newStatus: request.status
      });

      return Result.success({
        source: existingSource.toJSON(),
        message: `Source status updated to ${request.status}`
      });

    } catch (error) {
      this.logger.error('Error updating source status', { error, request });
      return Result.failure(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }
}