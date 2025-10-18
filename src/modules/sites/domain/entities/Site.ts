import { Result } from '@/shared/domain/types/Result';

export interface SiteProps {
  id: string;
  userId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  defaultCategory?: string;
  defaultStatus: string;
  defaultAuthor?: string;
  enableAutoPublish: boolean;
  enableFeaturedImage: boolean;
  enableTags: boolean;
  enableCategories: boolean;
  customFields?: Record<string, any>;
  isActive: boolean;
  lastPublishAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  enableAutoGeneration: boolean;
}

export interface SiteStatistics {
  totalSources: number;
  totalArticles: number;
  articlesPublished: number;
  articlesPending: number;
  isPublishing: boolean;
  lastPublishAt?: Date;
  lastError?: string;
}

export class Site {
  private constructor(private props: SiteProps) {}

  static create(props: Omit<SiteProps, 'id' | 'createdAt' | 'updatedAt'>): Result<Site, Error> {
    const validation = this.validate(props);
    if (validation.isFailure()) {
      return Result.failure(validation.error);
    }

    const siteProps: SiteProps = {
      ...props,
      id: `site_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Result.success(new Site(siteProps));
  }

  static fromPersistence(props: SiteProps): Site {
    return new Site(props);
  }

  private static validate(props: Partial<SiteProps>): Result<void, Error> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.failure(new Error('Site name is required'));
    }

    if (!props.url || !this.isValidUrl(props.url)) {
      return Result.failure(new Error('Valid site URL is required'));
    }

    if (!props.username || props.username.trim().length === 0) {
      return Result.failure(new Error('WordPress username is required'));
    }

    if (!props.password || props.password.trim().length === 0) {
      return Result.failure(new Error('WordPress password is required'));
    }

    if (!props.userId || props.userId.trim().length === 0) {
      return Result.failure(new Error('User ID is required'));
    }

    return Result.success(undefined);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Getters
  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get name(): string { return this.props.name; }
  get url(): string { return this.props.url; }
  get username(): string { return this.props.username; }
  get password(): string { return this.props.password; }
  get defaultCategory(): string | undefined { return this.props.defaultCategory; }
  get defaultStatus(): string { return this.props.defaultStatus; }
  get defaultAuthor(): string | undefined { return this.props.defaultAuthor; }
  get enableAutoPublish(): boolean { return this.props.enableAutoPublish; }
  get enableFeaturedImage(): boolean { return this.props.enableFeaturedImage; }
  get enableTags(): boolean { return this.props.enableTags; }
  get enableCategories(): boolean { return this.props.enableCategories; }
  get customFields(): Record<string, any> | undefined { return this.props.customFields; }
  get isActive(): boolean { return this.props.isActive; }
  get lastPublishAt(): Date | undefined { return this.props.lastPublishAt; }
  get lastError(): string | undefined { return this.props.lastError; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get enableAutoGeneration(): boolean { return this.props.enableAutoGeneration; }

  // Business methods
  updateConfiguration(updates: Partial<Pick<SiteProps,
    'name' | 'url' | 'username' | 'password' | 'defaultCategory' | 'defaultStatus' |
    'defaultAuthor' | 'enableAutoPublish' | 'enableFeaturedImage' | 'enableTags' |
    'enableCategories' | 'customFields' | 'enableAutoGeneration'
  >>): Result<Site, Error> {
    const newProps = { ...this.props, ...updates, updatedAt: new Date() };
    const validation = Site.validate(newProps);

    if (validation.isFailure()) {
      return Result.failure(validation.error);
    }

    return Result.success(new Site(newProps));
  }

  activate(): Site {
    return new Site({
      ...this.props,
      isActive: true,
      lastError: undefined,
      updatedAt: new Date()
    });
  }

  deactivate(): Site {
    return new Site({
      ...this.props,
      isActive: false,
      updatedAt: new Date()
    });
  }

  recordPublish(success: boolean, error?: string): Site {
    return new Site({
      ...this.props,
      lastPublishAt: success ? new Date() : this.props.lastPublishAt,
      lastError: error,
      updatedAt: new Date()
    });
  }

  toPlainObject(): SiteProps {
    return { ...this.props };
  }
}