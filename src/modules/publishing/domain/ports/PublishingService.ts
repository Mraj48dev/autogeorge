import { Result } from '../../../../shared/domain/types/Result';
import { PublicationTarget } from '../value-objects/PublicationTarget';
import { PublicationMetadata } from '../entities/Publication';

/**
 * Service interface for publishing content to external platforms.
 *
 * Defines the contract for publishing content to different platforms
 * like WordPress, social media, newsletters, etc.
 */
export interface PublishingService {
  /**
   * Publishes content to the specified target
   */
  publish(
    target: PublicationTarget,
    content: PublishingContent,
    metadata: PublicationMetadata
  ): Promise<Result<PublishingResult, PublishingError>>;

  /**
   * Updates already published content
   */
  update(
    target: PublicationTarget,
    externalId: string,
    content: PublishingContent,
    metadata: PublicationMetadata
  ): Promise<Result<PublishingResult, PublishingError>>;

  /**
   * Deletes published content
   */
  delete(
    target: PublicationTarget,
    externalId: string
  ): Promise<Result<void, PublishingError>>;

  /**
   * Gets the status of published content
   */
  getStatus(
    target: PublicationTarget,
    externalId: string
  ): Promise<Result<PublishingStatus, PublishingError>>;

  /**
   * Validates if the target is properly configured
   */
  validateTarget(
    target: PublicationTarget
  ): Promise<Result<TargetValidation, PublishingError>>;

  /**
   * Tests connectivity to the target platform
   */
  testConnection(
    target: PublicationTarget
  ): Promise<Result<ConnectionTest, PublishingError>>;

  /**
   * Gets supported platforms
   */
  getSupportedPlatforms(): string[];

  /**
   * Checks if a platform is supported
   */
  isPlatformSupported(platform: string): boolean;
}

/**
 * Content to be published
 */
export interface PublishingContent {
  title: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  attachments?: PublishingAttachment[];
}

/**
 * File attachment for publishing
 */
export interface PublishingAttachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  alt?: string;
  caption?: string;
}

/**
 * Result of a publishing operation
 */
export interface PublishingResult {
  externalId: string;
  externalUrl?: string;
  status: 'published' | 'draft' | 'pending' | 'scheduled';
  metadata?: Record<string, any>;
  warnings?: string[];
}

/**
 * Status of published content
 */
export interface PublishingStatus {
  externalId: string;
  status: 'published' | 'draft' | 'pending' | 'scheduled' | 'deleted';
  publishedAt?: Date;
  lastModified?: Date;
  url?: string;
  views?: number;
  metadata?: Record<string, any>;
}

/**
 * Target validation result
 */
export interface TargetValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  capabilities: PlatformCapabilities;
}

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  supportsScheduling: boolean;
  supportsFeaturedImages: boolean;
  supportsCategories: boolean;
  supportsTags: boolean;
  supportsCustomFields: boolean;
  supportsExcerpts: boolean;
  supportsAttachments: boolean;
  maxTitleLength?: number;
  maxContentLength?: number;
  maxExcerptLength?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

/**
 * Connection test result
 */
export interface ConnectionTest {
  isSuccessful: boolean;
  responseTime: number;
  lastChecked: Date;
  platformInfo?: {
    name: string;
    version: string;
    features: string[];
  };
  error?: string;
}

/**
 * Publishing error types
 */
export interface PublishingError {
  code: PublishingErrorCode;
  message: string;
  details?: Record<string, any>;
  isRetryable: boolean;
  platform: string;
}

export type PublishingErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'INVALID_CONTENT'
  | 'INVALID_CONFIGURATION'
  | 'NETWORK_ERROR'
  | 'PLATFORM_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTENT_TOO_LARGE'
  | 'UNSUPPORTED_FEATURE'
  | 'EXTERNAL_ID_NOT_FOUND'
  | 'UNKNOWN_ERROR';