import { Result } from '../../../shared/domain/types/Result';
import { PublicationTarget, WordPressConfig } from '../../domain/value-objects/PublicationTarget';
import { PublicationMetadata } from '../../domain/entities/Publication';
import {
  PublishingService,
  PublishingContent,
  PublishingResult,
  PublishingStatus,
  TargetValidation,
  ConnectionTest,
  PublishingError,
  PlatformCapabilities
} from '../../domain/ports/PublishingService';

/**
 * WordPress implementation of PublishingService.
 *
 * This service handles publishing content to WordPress sites
 * using the WordPress REST API.
 */
export class WordPressPublishingService implements PublishingService {
  private readonly supportedPlatforms = ['wordpress'];

  /**
   * Publishes content to WordPress
   */
  async publish(
    target: PublicationTarget,
    content: PublishingContent,
    metadata: PublicationMetadata
  ): Promise<Result<PublishingResult, PublishingError>> {
    try {
      if (!this.isPlatformSupported(target.getPlatform())) {
        return Result.failure({
          code: 'UNSUPPORTED_FEATURE',
          message: `Platform ${target.getPlatform()} is not supported by WordPress service`,
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      const config = target.getWordPressConfig();
      if (!config) {
        return Result.failure({
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid WordPress configuration',
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      // Prepare WordPress post data
      const postData = this.preparePostData(content, metadata, config);

      // Create the post
      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        '/wp-json/wp/v2/posts',
        'POST',
        postData,
        config
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          code: this.mapHttpErrorCode(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { httpStatus: response.status, errorData },
          isRetryable: this.isRetryableHttpError(response.status),
          platform: target.getPlatform()
        });
      }

      const postResult = await response.json();
      
      const result: PublishingResult = {
        externalId: postResult.id.toString(),
        externalUrl: postResult.link,
        status: this.mapWordPressStatus(postResult.status),
        metadata: {
          wordpressId: postResult.id,
          slug: postResult.slug,
          permalink: postResult.link,
          dateCreated: postResult.date,
          dateModified: postResult.modified
        }
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
        details: { originalError: error },
        isRetryable: true,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Updates already published content
   */
  async update(
    target: PublicationTarget,
    externalId: string,
    content: PublishingContent,
    metadata: PublicationMetadata
  ): Promise<Result<PublishingResult, PublishingError>> {
    try {
      const config = target.getWordPressConfig();
      if (!config) {
        return Result.failure({
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid WordPress configuration',
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      const postData = this.preparePostData(content, metadata, config);

      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        `/wp-json/wp/v2/posts/${externalId}`,
        'PUT',
        postData,
        config
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          code: this.mapHttpErrorCode(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { httpStatus: response.status, errorData },
          isRetryable: this.isRetryableHttpError(response.status),
          platform: target.getPlatform()
        });
      }

      const postResult = await response.json();
      
      const result: PublishingResult = {
        externalId: postResult.id.toString(),
        externalUrl: postResult.link,
        status: this.mapWordPressStatus(postResult.status),
        metadata: {
          wordpressId: postResult.id,
          slug: postResult.slug,
          permalink: postResult.link,
          dateCreated: postResult.date,
          dateModified: postResult.modified
        }
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
        details: { originalError: error },
        isRetryable: true,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Deletes published content
   */
  async delete(
    target: PublicationTarget,
    externalId: string
  ): Promise<Result<void, PublishingError>> {
    try {
      const config = target.getWordPressConfig();
      if (!config) {
        return Result.failure({
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid WordPress configuration',
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        `/wp-json/wp/v2/posts/${externalId}`,
        'DELETE',
        { force: true },
        config
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          code: this.mapHttpErrorCode(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { httpStatus: response.status, errorData },
          isRetryable: this.isRetryableHttpError(response.status),
          platform: target.getPlatform()
        });
      }

      return Result.success(undefined);

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
        details: { originalError: error },
        isRetryable: true,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Gets the status of published content
   */
  async getStatus(
    target: PublicationTarget,
    externalId: string
  ): Promise<Result<PublishingStatus, PublishingError>> {
    try {
      const config = target.getWordPressConfig();
      if (!config) {
        return Result.failure({
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid WordPress configuration',
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        `/wp-json/wp/v2/posts/${externalId}`,
        'GET',
        null,
        config
      );

      if (!response.ok) {
        if (response.status === 404) {
          return Result.success({
            externalId,
            status: 'deleted'
          });
        }

        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          code: this.mapHttpErrorCode(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { httpStatus: response.status, errorData },
          isRetryable: this.isRetryableHttpError(response.status),
          platform: target.getPlatform()
        });
      }

      const post = await response.json();
      
      const status: PublishingStatus = {
        externalId: post.id.toString(),
        status: this.mapWordPressStatus(post.status),
        publishedAt: post.date ? new Date(post.date) : undefined,
        lastModified: post.modified ? new Date(post.modified) : undefined,
        url: post.link,
        metadata: {
          slug: post.slug,
          title: post.title?.rendered,
          excerpt: post.excerpt?.rendered,
          categories: post.categories,
          tags: post.tags
        }
      };

      return Result.success(status);

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
        details: { originalError: error },
        isRetryable: true,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Validates if the target is properly configured
   */
  async validateTarget(
    target: PublicationTarget
  ): Promise<Result<TargetValidation, PublishingError>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!this.isPlatformSupported(target.getPlatform())) {
        errors.push(`Platform ${target.getPlatform()} is not supported`);
      }

      const config = target.getWordPressConfig();
      if (!config) {
        errors.push('WordPress configuration is missing');
      } else {
        if (!config.username) {
          errors.push('WordPress username is required');
        }
        if (!config.password) {
          errors.push('WordPress password is required');
        }
      }

      const siteUrl = target.getSiteUrl();
      if (!siteUrl) {
        errors.push('Site URL is required');
      } else {
        try {
          new URL(siteUrl);
        } catch {
          errors.push('Invalid site URL format');
        }
      }

      const capabilities: PlatformCapabilities = {
        supportsScheduling: true,
        supportsFeaturedImages: true,
        supportsCategories: true,
        supportsTags: true,
        supportsCustomFields: true,
        supportsExcerpts: true,
        supportsAttachments: true,
        maxTitleLength: 255,
        maxContentLength: undefined,
        maxExcerptLength: 320,
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxFileSize: 10 * 1024 * 1024 // 10MB
      };

      const validation: TargetValidation = {
        isValid: errors.length === 0,
        errors,
        warnings,
        capabilities
      };

      return Result.success(validation);

    } catch (error) {
      return Result.failure({
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        details: { originalError: error },
        isRetryable: false,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Tests connectivity to the target platform
   */
  async testConnection(
    target: PublicationTarget
  ): Promise<Result<ConnectionTest, PublishingError>> {
    try {
      const startTime = Date.now();
      const config = target.getWordPressConfig();
      
      if (!config) {
        return Result.failure({
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid WordPress configuration',
          isRetryable: false,
          platform: target.getPlatform()
        });
      }

      // Test basic connectivity by fetching site info
      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        '/wp-json',
        'GET',
        null,
        config
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return Result.success({
          isSuccessful: false,
          responseTime,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }

      const siteInfo = await response.json();

      const test: ConnectionTest = {
        isSuccessful: true,
        responseTime,
        lastChecked: new Date(),
        platformInfo: {
          name: siteInfo.name || 'WordPress',
          version: siteInfo.version || 'unknown',
          features: Object.keys(siteInfo.namespaces || {})
        }
      };

      return Result.success(test);

    } catch (error) {
      return Result.failure({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown connection error',
        details: { originalError: error },
        isRetryable: true,
        platform: target.getPlatform()
      });
    }
  }

  /**
   * Gets supported platforms
   */
  getSupportedPlatforms(): string[] {
    return [...this.supportedPlatforms];
  }

  /**
   * Checks if a platform is supported
   */
  isPlatformSupported(platform: string): boolean {
    return this.supportedPlatforms.includes(platform);
  }

  /**
   * Prepares WordPress post data
   */
  private preparePostData(
    content: PublishingContent,
    metadata: PublicationMetadata,
    config: WordPressConfig
  ): any {
    const postData: any = {
      title: metadata.title || content.title,
      content: content.content,
      status: config.status || 'draft'
    };

    if (content.excerpt || metadata.excerpt) {
      postData.excerpt = content.excerpt || metadata.excerpt;
    }

    if (metadata.categories && metadata.categories.length > 0) {
      postData.categories = metadata.categories;
    }

    if (metadata.tags && metadata.tags.length > 0) {
      postData.tags = metadata.tags;
    }

    if (config.author) {
      postData.author = config.author;
    }

    if (config.customFields && metadata.customFields) {
      postData.meta = { ...config.customFields, ...metadata.customFields };
    }

    return postData;
  }

  /**
   * Makes a WordPress REST API request
   */
  private async makeWordPressRequest(
    siteUrl: string,
    endpoint: string,
    method: string,
    data: any,
    config: WordPressConfig
  ): Promise<Response> {
    const url = `${siteUrl.replace(/\/$/, '')}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
    };

    const requestOptions: RequestInit = {
      method,
      headers
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    return fetch(url, requestOptions);
  }

  /**
   * Maps WordPress post status to internal status
   */
  private mapWordPressStatus(wpStatus: string): 'published' | 'draft' | 'pending' | 'scheduled' {
    switch (wpStatus) {
      case 'publish':
        return 'published';
      case 'pending':
        return 'pending';
      case 'future':
        return 'scheduled';
      case 'draft':
      case 'private':
      default:
        return 'draft';
    }
  }

  /**
   * Maps HTTP status codes to error codes
   */
  private mapHttpErrorCode(status: number): string {
    switch (status) {
      case 401:
        return 'AUTHENTICATION_FAILED';
      case 403:
        return 'AUTHORIZATION_FAILED';
      case 404:
        return 'EXTERNAL_ID_NOT_FOUND';
      case 413:
        return 'CONTENT_TOO_LARGE';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'PLATFORM_ERROR';
      default:
        return 'NETWORK_ERROR';
    }
  }

  /**
   * Checks if an HTTP error is retryable
   */
  private isRetryableHttpError(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }
}