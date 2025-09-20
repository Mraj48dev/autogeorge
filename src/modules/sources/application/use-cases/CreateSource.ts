import { Result } from '../../shared/domain/types/Result';
import { BaseUseCase } from '../../shared/application/base/UseCase';
import { SourceRepository } from '../../domain/ports/SourceRepository';
import { SourceFetchService } from '../../domain/ports/SourceFetchService';
import { Source, SourceConfiguration } from '../../domain/entities/Source';
import { SourceName } from '../../domain/value-objects/SourceName';
import { SourceType } from '../../domain/value-objects/SourceType';
import { SourceUrl } from '../../domain/value-objects/SourceUrl';

/**
 * Use case for creating new sources
 * Validates, tests, and saves new content sources
 */
export class CreateSource extends BaseUseCase<CreateSourceRequest, CreateSourceResponse> {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly sourceFetchService: SourceFetchService
  ) {
    super();
  }

  async execute(request: CreateSourceRequest): Promise<Result<CreateSourceResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Validate specific request fields
      const requestValidation = this.validateCreateRequest(request);
      if (requestValidation.isFailure()) {
        return Result.failure(requestValidation.error);
      }

      // Create value objects
      const name = SourceName.fromString(request.name);
      const type = SourceType.fromString(request.type);
      const url = request.url ? SourceUrl.fromString(request.url) : undefined;

      // Check for duplicates
      if (url) {
        const existsResult = await this.sourceRepository.existsByTypeAndUrl(type, url.getValue());
        if (existsResult.isFailure()) {
          return Result.failure(existsResult.error);
        }
        if (existsResult.value) {
          return Result.failure(new Error('A source with this type and URL already exists'));
        }
      }

      // Create source entity
      let source: Source;
      try {
        if (type.isRss() && url) {
          source = Source.createRssSource(name, url, request.configuration);
        } else if (type.isTelegram() && url) {
          source = Source.createTelegramSource(name, url, request.configuration);
        } else if (type.isCalendar()) {
          source = Source.createCalendarSource(name, request.configuration);
        } else {
          return Result.failure(new Error('Invalid source type or missing required URL'));
        }
      } catch (error) {
        return Result.failure(this.handleError(error, 'Failed to create source entity'));
      }

      // Test source connectivity (optional, based on request)
      if (request.testConnection) {
        const testResult = await this.sourceFetchService.testSource(source);
        if (testResult.isFailure()) {
          return Result.failure(new Error(`Source test failed: ${testResult.error.message}`));
        }
        if (!testResult.value.isReachable) {
          return Result.failure(new Error('Source is not reachable or invalid'));
        }
      }

      // Save source
      const saveResult = await this.sourceRepository.save(source);
      if (saveResult.isFailure()) {
        return Result.failure(saveResult.error);
      }

      return Result.success({
        source: saveResult.value,
        message: 'Source created successfully'
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to create source'));
    }
  }

  private validateCreateRequest(request: CreateSourceRequest): Result<void, Error> {
    if (!request.name || request.name.trim().length === 0) {
      return Result.failure(new Error('Source name is required'));
    }

    if (!request.type || request.type.trim().length === 0) {
      return Result.failure(new Error('Source type is required'));
    }

    const validTypes = ['rss', 'telegram', 'calendar'];
    if (!validTypes.includes(request.type.toLowerCase())) {
      return Result.failure(new Error(`Invalid source type. Valid types: ${validTypes.join(', ')}`));
    }

    // Validate URL requirement
    const type = request.type.toLowerCase();
    if ((type === 'rss' || type === 'telegram') && !request.url) {
      return Result.failure(new Error(`URL is required for ${type} sources`));
    }

    if (type === 'calendar' && request.url) {
      return Result.failure(new Error('Calendar sources do not support URLs'));
    }

    return Result.success(undefined);
  }
}

// Request interface
export interface CreateSourceRequest {
  name: string;
  type: string;
  url?: string;
  configuration?: SourceConfiguration;
  testConnection?: boolean;
}

// Response interface
export interface CreateSourceResponse {
  source: Source;
  message: string;
}