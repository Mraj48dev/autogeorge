import { Result } from '../../../../shared/domain/types/Result';
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
      const postData = await this.preparePostData(content, metadata, config, target);

      // Create the post
      const response = await this.makeWordPressRequest(
        target.getSiteUrl(),
        '/wp-json/wp/v2/posts',
        'POST',
        postData,
        config
      );

      if (!response.ok) {
        // ✅ ENHANCED: Better error handling for HTML responses
        let errorData: any = {};
        let responseText = '';

        try {
          responseText = await response.text();

          // Try to parse as JSON first
          if (responseText.trim().startsWith('{')) {
            errorData = JSON.parse(responseText);
          } else {
            // HTML response - extract useful info
            console.error('🚨 [WordPress] Received HTML response instead of JSON:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              htmlPreview: responseText.substring(0, 200),
              isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html>')
            });

            errorData = {
              message: `WordPress API returned HTML instead of JSON. Check URL and REST API availability.`,
              htmlResponse: responseText.substring(0, 500),
              possibleIssues: [
                'WordPress REST API not enabled',
                'Incorrect site URL format',
                'Security plugin blocking requests',
                'Invalid credentials redirecting to login page'
              ]
            };
          }
        } catch (parseError) {
          errorData = {
            message: 'Failed to parse WordPress response',
            rawResponse: responseText.substring(0, 500),
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          };
        }

        return Result.failure({
          code: this.mapHttpErrorCode(response.status),
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          details: { httpStatus: response.status, errorData, responseText: responseText.substring(0, 500) },
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

      const postData = await this.preparePostData(content, metadata, config, target);

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
  private async preparePostData(
    content: PublishingContent,
    metadata: PublicationMetadata,
    config: WordPressConfig,
    target: PublicationTarget
  ): Promise<any> {
    // 🔍 DEBUG: Log target in preparePostData
    console.log(`🔍 [WordPress-PreparePost] Target received:`, {
      siteUrl: target.siteUrl,
      platform: target.getPlatform(),
      hasConfiguration: !!target.configuration,
      configType: typeof target.configuration,
      configKeys: target.configuration ? Object.keys(target.configuration) : []
    });
    const postData: any = {
      title: metadata.title || content.title,
      content: content.content,
      status: config.status || 'draft'
    };

    // ✅ ENHANCED: Add slug support
    if (content.slug || metadata.slug) {
      postData.slug = content.slug || metadata.slug;
    }

    // ✅ ENHANCED: Use meta description as excerpt if provided
    if (metadata.yoast_wpseo_metadesc) {
      postData.excerpt = metadata.yoast_wpseo_metadesc;
    } else if (content.excerpt || metadata.excerpt) {
      postData.excerpt = content.excerpt || metadata.excerpt;
    }

    // ✅ ENHANCED: Handle categories (convert names to IDs if needed)
    console.log(`🔍 [WordPress-CategoryFlow] Metadata categories check:`, {
      hasCategories: !!metadata.categories,
      categories: metadata.categories,
      categoriesLength: metadata.categories?.length || 0
    });

    if (metadata.categories && metadata.categories.length > 0) {
      // Check if categories are names (strings) or IDs (numbers)
      const categoryIds = await this.resolveCategoryIds(metadata.categories, target);
      if (categoryIds.length > 0) {
        postData.categories = categoryIds;
        console.log(`✅ [WordPress-CategoryFlow] Categories assigned to postData:`, categoryIds);
      } else {
        console.log(`⚠️ [WordPress-CategoryFlow] No category IDs resolved, skipping`);
      }
    } else {
      console.log(`❌ [WordPress-CategoryFlow] No categories in metadata or empty array`);
    }

    // ✅ FIXED: Handle tags properly for WordPress REST API
    if (metadata.tags && metadata.tags.length > 0) {
      // WordPress REST API expects tag names as strings
      // It will automatically create tags if they don't exist
      postData.tags = metadata.tags.map(tag => {
        // Ensure tags are strings and clean them
        return typeof tag === 'string' ? tag.trim() : String(tag).trim();
      }).filter(tag => tag.length > 0);
    }

    if (config.author) {
      postData.author = config.author;
    }

    // ✅ YOAST SEO: Add meta fields support for Yoast plugin
    const metaFields: any = {};

    // Include custom fields from config and metadata
    if (config.customFields) {
      Object.assign(metaFields, config.customFields);
    }
    if (metadata.customFields) {
      Object.assign(metaFields, metadata.customFields);
    }

    // ✅ YOAST SEO: Add Yoast meta description if provided
    // Based on official Yoast documentation 2024
    if (metadata.yoast_wpseo_metadesc) {
      // ✅ OFFICIAL: The correct Yoast meta field (requires registration in WordPress)
      metaFields._yoast_wpseo_metadesc = metadata.yoast_wpseo_metadesc;

      // ✅ FALLBACKS: Alternative approaches for compatibility
      metaFields.yoast_wpseo_metadesc = metadata.yoast_wpseo_metadesc; // Without underscore
      metaFields._aioseop_description = metadata.yoast_wpseo_metadesc; // All in One SEO

      // ✅ EXPERIMENTAL: Try direct database field names
      metaFields.yoast_meta_description = metadata.yoast_wpseo_metadesc;
      metaFields.seo_meta_description = metadata.yoast_wpseo_metadesc;
    }

    // Only add meta object if we have fields to add
    if (Object.keys(metaFields).length > 0) {
      postData.meta = metaFields;
    }

    // Immagine in evidenza
    if (metadata.featuredMediaId) {
      postData.featured_media = metadata.featuredMediaId;
    }

    // ✅ ENHANCED: Add debugging info
    console.log('🔧 [WordPressPublishingService] Prepared post data:', {
      title: postData.title,
      contentLength: postData.content?.length || 0,
      status: postData.status,
      slug: postData.slug,
      tagsCount: postData.tags?.length || 0,
      tags: postData.tags,
      categoriesCount: postData.categories?.length || 0,
      categories: postData.categories,
      originalCategories: metadata.categories,
      hasSlug: !!postData.slug,
      hasExcerpt: !!postData.excerpt,
      // ✅ YOAST SEO: Debug info for meta fields
      hasMetaFields: !!postData.meta,
      metaFieldsCount: postData.meta ? Object.keys(postData.meta).length : 0,
      hasYoastMetaDesc: !!(postData.meta && postData.meta._yoast_wpseo_metadesc),
      yoastMetaDescLength: postData.meta?._yoast_wpseo_metadesc?.length || 0,
      // ✅ ENHANCED: Debug all Yoast field attempts
      yoastFieldsAttempted: postData.meta ? Object.keys(postData.meta).filter(key =>
        key.includes('yoast') || key.includes('seo') || key.includes('description')
      ) : [],
      excerptUsedAsMetaDesc: !!(metadata.yoast_wpseo_metadesc && postData.excerpt === metadata.yoast_wpseo_metadesc)
    });

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
    // ✅ ENHANCED: Better URL validation and formatting
    let baseUrl = siteUrl.trim();

    // Ensure URL has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    // Remove trailing slash and add endpoint
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

    console.log('🌐 [WordPress] Making request:', {
      url,
      method,
      endpoint,
      hasAuth: !!config.username && !!config.password,
      dataKeys: data ? Object.keys(data) : []
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AutoGeorge/1.0 WordPress Publisher',
      'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      // ✅ Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);

      console.log('📡 [WordPress] Response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        contentType: response.headers.get('content-type'),
        isOk: response.ok
      });

      return response;
    } catch (error) {
      console.error('🚨 [WordPress] Request failed:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      throw error;
    }
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

  /**
   * Resolves category names to IDs using WordPress REST API
   * @param categories Array of category names or IDs
   * @param target Publication target with WordPress credentials
   * @returns Array of category IDs
   */
  private async resolveCategoryIds(categories: (string | number)[], target: PublicationTarget): Promise<number[]> {
    console.log(`🔍 [WordPress-CategoryResolve] Starting resolution for categories:`, categories);
    const categoryIds: number[] = [];

    for (const category of categories) {
      console.log(`🔍 [WordPress-CategoryResolve] Processing category:`, { category, type: typeof category });

      // If it's already a number, use it directly
      if (typeof category === 'number') {
        categoryIds.push(category);
        console.log(`✅ [WordPress-CategoryResolve] Category ${category} is already ID`);
        continue;
      }

      // If it's a string that looks like a number, convert it
      if (typeof category === 'string' && /^\d+$/.test(category)) {
        const id = parseInt(category, 10);
        categoryIds.push(id);
        console.log(`✅ [WordPress-CategoryResolve] Converted "${category}" to ID ${id}`);
        continue;
      }

      // It's a category name, need to resolve to ID
      try {
        console.log(`🔍 [WordPress-CategoryResolve] Resolving name "${category}" to ID...`);
        const categoryId = await this.getCategoryIdByName(category, target);
        if (categoryId) {
          categoryIds.push(categoryId);
          console.log(`✅ [WordPress-CategoryResolve] Resolved category "${category}" to ID ${categoryId}`);
        } else {
          console.warn(`⚠️ [WordPress-CategoryResolve] Category "${category}" not found, skipping`);
        }
      } catch (error) {
        console.error(`❌ [WordPress-CategoryResolve] Failed to resolve category "${category}":`, error);
      }
    }

    console.log(`🔍 [WordPress-CategoryResolve] Final category IDs:`, categoryIds);
    return categoryIds;
  }

  /**
   * Gets category ID by name from WordPress API
   * @param categoryName The category name to search for
   * @param target Publication target with WordPress credentials
   * @returns Category ID or null if not found
   */
  private async getCategoryIdByName(categoryName: string, target: PublicationTarget): Promise<number | null> {
    try {
      // 🔍 DEBUG: Log target structure
      console.log(`🔍 [WordPress-CategoryAPI] Target structure:`, {
        siteUrl: target.siteUrl,
        platform: target.getPlatform(),
        hasConfiguration: !!target.configuration,
        configKeys: target.configuration ? Object.keys(target.configuration) : [],
        username: target.configuration?.username,
        password: target.configuration?.password ? '[SET]' : '[MISSING]'
      });

      if (!target.configuration?.username || !target.configuration?.password) {
        console.error(`❌ [WordPress-CategoryAPI] Missing credentials in target.configuration`);
        return null;
      }

      const auth = Buffer.from(`${target.configuration.username}:${target.configuration.password}`).toString('base64');
      const url = `${target.siteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}&per_page=10`;

      console.log(`🔍 [WordPress-CategoryAPI] Calling:`, { url, categoryName });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 [WordPress-CategoryAPI] Response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        console.error(`❌ [WordPress-CategoryAPI] Categories API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const categories = await response.json();
      console.log(`📊 [WordPress-CategoryAPI] Found categories:`, categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name
      })));

      // Look for exact match first
      const exactMatch = categories.find((cat: any) =>
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (exactMatch) {
        console.log(`✅ [WordPress-CategoryAPI] Exact match found:`, { id: exactMatch.id, name: exactMatch.name });
        return exactMatch.id;
      }

      // If no exact match, try case-insensitive partial match
      const partialMatch = categories.find((cat: any) =>
        cat.name.toLowerCase().includes(categoryName.toLowerCase())
      );

      if (partialMatch) {
        console.log(`✅ [WordPress-CategoryAPI] Partial match found:`, { id: partialMatch.id, name: partialMatch.name });
        return partialMatch.id;
      }

      console.log(`❌ [WordPress-CategoryAPI] No match found for "${categoryName}"`);
      return null;

    } catch (error) {
      console.error(`❌ [WordPress-CategoryAPI] Error fetching categories:`, error);
      return null;
    }
  }
}