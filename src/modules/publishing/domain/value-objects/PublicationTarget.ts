import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Value Object representing a publication target platform.
 *
 * PublicationTarget encapsulates the destination for content publication,
 * including platform type, configuration, and validation logic.
 */
export class PublicationTarget extends ValueObject<PublicationTargetValue> {
  private constructor(value: PublicationTargetValue) {
    super(value);
    this.validate();
  }

  /**
   * Creates a PublicationTarget from a value object
   */
  static fromValue(value: PublicationTargetValue): PublicationTarget {
    return new PublicationTarget(value);
  }

  /**
   * Creates a WordPress publication target
   */
  static wordpress(
    siteId: string,
    siteUrl: string,
    configuration: WordPressConfig
  ): PublicationTarget {
    return new PublicationTarget({
      platform: 'wordpress',
      siteId,
      siteUrl,
      configuration,
    });
  }

  /**
   * Creates a social media publication target
   */
  static socialMedia(
    platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram',
    accountId: string,
    configuration: SocialMediaConfig
  ): PublicationTarget {
    return new PublicationTarget({
      platform,
      siteId: accountId,
      siteUrl: `https://${platform}.com/${accountId}`,
      configuration,
    });
  }

  /**
   * Creates a newsletter publication target
   */
  static newsletter(
    provider: 'mailchimp' | 'sendgrid' | 'convertkit',
    listId: string,
    configuration: NewsletterConfig
  ): PublicationTarget {
    return new PublicationTarget({
      platform: provider,
      siteId: listId,
      siteUrl: '',
      configuration,
    });
  }

  /**
   * Gets the platform type
   */
  getPlatform(): string {
    return this.value.platform;
  }

  /**
   * Gets the site ID
   */
  getSiteId(): string {
    return this.value.siteId;
  }

  /**
   * Gets the site URL
   */
  getSiteUrl(): string {
    return this.value.siteUrl;
  }

  /**
   * Gets the configuration
   */
  getConfiguration(): Record<string, any> {
    return this.value.configuration;
  }

  /**
   * Checks if the target is WordPress
   */
  isWordPress(): boolean {
    return this.value.platform === 'wordpress';
  }

  /**
   * Checks if the target is social media
   */
  isSocialMedia(): boolean {
    return ['twitter', 'facebook', 'linkedin', 'instagram'].includes(this.value.platform);
  }

  /**
   * Checks if the target is a newsletter
   */
  isNewsletter(): boolean {
    return ['mailchimp', 'sendgrid', 'convertkit'].includes(this.value.platform);
  }

  /**
   * Gets WordPress configuration if applicable
   */
  getWordPressConfig(): WordPressConfig | undefined {
    return this.isWordPress() ? this.value.configuration as WordPressConfig : undefined;
  }

  /**
   * Gets social media configuration if applicable
   */
  getSocialMediaConfig(): SocialMediaConfig | undefined {
    return this.isSocialMedia() ? this.value.configuration as SocialMediaConfig : undefined;
  }

  /**
   * Gets newsletter configuration if applicable
   */
  getNewsletterConfig(): NewsletterConfig | undefined {
    return this.isNewsletter() ? this.value.configuration as NewsletterConfig : undefined;
  }

  /**
   * Validates the publication target
   */
  protected validate(value: PublicationTargetValue): void {
    if (!value || typeof value !== 'object') {
      throw new Error('PublicationTarget must be an object');
    }

    const { platform, siteId, siteUrl, configuration } = value;

    if (!platform || typeof platform !== 'string') {
      throw new Error('Platform must be a non-empty string');
    }

    if (!siteId || typeof siteId !== 'string') {
      throw new Error('Site ID must be a non-empty string');
    }

    if (typeof siteUrl !== 'string') {
      throw new Error('Site URL must be a string');
    }

    if (!configuration || typeof configuration !== 'object') {
      throw new Error('Configuration must be an object');
    }

    // Platform-specific validation
    this.validatePlatformSpecific(value);
  }

  /**
   * Validates platform-specific configuration
   */
  private validatePlatformSpecific(value: PublicationTargetValue): void {
    const { platform, configuration } = value;

    switch (platform) {
      case 'wordpress':
        this.validateWordPressConfig(configuration as WordPressConfig);
        break;
      case 'twitter':
      case 'facebook':
      case 'linkedin':
      case 'instagram':
        this.validateSocialMediaConfig(configuration as SocialMediaConfig);
        break;
      case 'mailchimp':
      case 'sendgrid':
      case 'convertkit':
        this.validateNewsletterConfig(configuration as NewsletterConfig);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Validates WordPress configuration
   */
  private validateWordPressConfig(config: WordPressConfig): void {
    if (!config.username || typeof config.username !== 'string') {
      throw new Error('WordPress username is required');
    }

    if (!config.password || typeof config.password !== 'string') {
      throw new Error('WordPress password is required');
    }

    if (config.status && !['draft', 'publish', 'pending', 'private'].includes(config.status)) {
      throw new Error('Invalid WordPress post status');
    }
  }

  /**
   * Validates social media configuration
   */
  private validateSocialMediaConfig(config: SocialMediaConfig): void {
    if (!config.accessToken || typeof config.accessToken !== 'string') {
      throw new Error('Social media access token is required');
    }
  }

  /**
   * Validates newsletter configuration
   */
  private validateNewsletterConfig(config: NewsletterConfig): void {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('Newsletter API key is required');
    }
  }

  /**
   * Returns the JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      platform: this.value.platform,
      siteId: this.value.siteId,
      siteUrl: this.value.siteUrl,
      configuration: this.value.configuration,
    };
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return `${this.value.platform}:${this.value.siteId}`;
  }
}

/**
 * Publication target value interface
 */
export interface PublicationTargetValue {
  platform: string;
  siteId: string;
  siteUrl: string;
  configuration: Record<string, any>;
}

/**
 * WordPress configuration
 */
export interface WordPressConfig {
  username: string;
  password: string;
  status?: 'draft' | 'publish' | 'pending' | 'private';
  categories?: string[];
  tags?: string[];
  featuredImageId?: number;
  customFields?: Record<string, any>;
  excerpt?: string;
  author?: string;
}

/**
 * Social media configuration
 */
export interface SocialMediaConfig {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  accountId?: string;
  hashtags?: string[];
  mentions?: string[];
  scheduledTime?: Date;
}

/**
 * Newsletter configuration
 */
export interface NewsletterConfig {
  apiKey: string;
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  templateId?: string;
  segmentId?: string;
  tags?: string[];
}