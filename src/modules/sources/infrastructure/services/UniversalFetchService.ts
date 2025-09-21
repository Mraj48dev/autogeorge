import { Result } from '../../shared/domain/types/Result';
import {
  SourceFetchService,
  FetchResult,
  FetchError,
  FetchedItem,
  FetchMetadata,
  SourceTestResult,
  ServiceHealth,
  ValidationResult
} from '../../domain/ports/SourceFetchService';
import { Source } from '../../domain/entities/Source';
import { RssFetchService } from './RssFetchService';

/**
 * Universal fetch service that handles all source types
 * This is a basic implementation that can be extended with specific fetchers
 */
export class UniversalFetchService implements SourceFetchService {
  private readonly rssService: RssFetchService;

  constructor(
    rssService?: RssFetchService,
    private readonly telegramService?: TelegramFetchService,
    private readonly calendarService?: CalendarFetchService
  ) {
    this.rssService = rssService || new RssFetchService();
  }

  async fetchContent(source: Source): Promise<Result<FetchResult, FetchError>> {
    try {
      const startTime = Date.now();

      switch (source.type.getValue()) {
        case 'rss':
          return await this.rssService.fetchRss(source);

        case 'telegram':
          if (!this.telegramService) {
            return Result.failure(new FetchError('Telegram service not available', 'server'));
          }
          return await this.telegramService.fetchTelegram(source);

        case 'calendar':
          if (!this.calendarService) {
            return Result.failure(new FetchError('Calendar service not available', 'server'));
          }
          return await this.calendarService.fetchCalendar(source);

        default:
          return Result.failure(new FetchError(`Unsupported source type: ${source.type.getValue()}`, 'validation'));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.failure(new FetchError(errorMessage, 'unknown'));
    }
  }

  async testSource(source: Source): Promise<Result<SourceTestResult, FetchError>> {
    try {
      switch (source.type.getValue()) {
        case 'rss':
          return await this.rssService.testRss(source);

        case 'telegram':
          return await this.testTelegramSource(source);

        case 'calendar':
          return await this.testCalendarSource(source);

        default:
          return Result.failure(new FetchError(`Unsupported source type: ${source.type.getValue()}`, 'validation'));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.failure(new FetchError(errorMessage, 'unknown'));
    }
  }

  async getServiceHealth(): Promise<Result<ServiceHealth, Error>> {
    try {
      const health: ServiceHealth = {
        isHealthy: true,
        services: {
          rss: await this.checkRssHealth(),
          telegram: await this.checkTelegramHealth(),
          calendar: await this.checkCalendarHealth(),
        },
        lastCheck: new Date(),
      };

      // Overall health is healthy if at least one service is available
      health.isHealthy = Object.values(health.services).some(service => service.isAvailable);

      return Result.success(health);

    } catch (error) {
      return Result.failure(new Error(`Failed to check service health: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  async validateSourceConfig(source: Source): Promise<Result<ValidationResult, Error>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Basic validation
      if (!source.name.getValue().trim()) {
        errors.push('Source name is required');
      }

      // Type-specific validation
      switch (source.type.getValue()) {
        case 'rss':
          this.validateRssConfig(source, errors, warnings, suggestions);
          break;

        case 'telegram':
          this.validateTelegramConfig(source, errors, warnings, suggestions);
          break;

        case 'calendar':
          this.validateCalendarConfig(source, errors, warnings, suggestions);
          break;

        default:
          errors.push(`Unsupported source type: ${source.type.getValue()}`);
      }

      return Result.success({
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to validate source config: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  // Private helper methods

  private async testRssSource(source: Source): Promise<Result<SourceTestResult, FetchError>> {
    if (!source.url) {
      return Result.failure(new FetchError('RSS source requires URL', 'validation'));
    }

    // Mock implementation - in real app, would test RSS feed
    return Result.success({
      isReachable: true,
      isValid: true,
      responseTime: 150,
      sampleItems: [],
      warnings: ['This is a mock implementation'],
    });
  }

  private async testTelegramSource(source: Source): Promise<Result<SourceTestResult, FetchError>> {
    if (!source.url) {
      return Result.failure(new FetchError('Telegram source requires URL', 'validation'));
    }

    // Mock implementation
    return Result.success({
      isReachable: true,
      isValid: true,
      responseTime: 200,
      sampleItems: [],
      warnings: ['This is a mock implementation'],
    });
  }

  private async testCalendarSource(source: Source): Promise<Result<SourceTestResult, FetchError>> {
    // Mock implementation
    return Result.success({
      isReachable: true,
      isValid: true,
      responseTime: 100,
      sampleItems: [],
      warnings: ['This is a mock implementation'],
    });
  }

  private async checkRssHealth(): Promise<any> {
    return {
      isAvailable: true,
      responseTime: 150,
    };
  }

  private async checkTelegramHealth(): Promise<any> {
    return {
      isAvailable: false,
      error: 'Service not configured',
    };
  }

  private async checkCalendarHealth(): Promise<any> {
    return {
      isAvailable: false,
      error: 'Service not configured',
    };
  }

  private validateRssConfig(source: Source, errors: string[], warnings: string[], suggestions: string[]): void {
    if (!source.url) {
      errors.push('RSS source requires a valid URL');
      return;
    }

    const url = source.url.getValue();
    if (!url.includes('rss') && !url.includes('feed') && !url.includes('.xml')) {
      warnings.push('URL does not appear to be an RSS feed');
      suggestions.push('Ensure the URL points to a valid RSS or Atom feed');
    }

    if (!source.url.isSecure()) {
      warnings.push('Non-HTTPS URLs may have security implications');
    }
  }

  private validateTelegramConfig(source: Source, errors: string[], warnings: string[], suggestions: string[]): void {
    if (!source.url) {
      errors.push('Telegram source requires a valid channel URL');
      return;
    }

    if (!source.url.isTelegramChannel()) {
      errors.push('URL must be a valid Telegram channel (t.me or telegram.me)');
    }
  }

  private validateCalendarConfig(source: Source, errors: string[], warnings: string[], suggestions: string[]): void {
    if (source.url) {
      warnings.push('Calendar sources do not typically require URLs');
    }

    const config = source.configuration;
    if (!config || !('calendarId' in config) || !config.calendarId) {
      warnings.push('Calendar ID should be specified in configuration');
    }
  }
}

// Placeholder interfaces for specific services
interface RssFetchService {
  fetchRss(source: Source): Promise<Result<FetchResult, FetchError>>;
}

interface TelegramFetchService {
  fetchTelegram(source: Source): Promise<Result<FetchResult, FetchError>>;
}

interface CalendarFetchService {
  fetchCalendar(source: Source): Promise<Result<FetchResult, FetchError>>;
}