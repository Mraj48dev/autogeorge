import { AggregateRoot } from '../../shared/domain/base/Entity';
import { SourceId } from '../value-objects/SourceId';
import { SourceName } from '../value-objects/SourceName';
import { SourceType } from '../value-objects/SourceType';
import { SourceStatus } from '../value-objects/SourceStatus';
import { SourceUrl } from '../value-objects/SourceUrl';
import { SourceCreated } from '../events/SourceCreated';
import { SourceUpdated } from '../events/SourceUpdated';
import { SourceFetched } from '../events/SourceFetched';
import { SourceErrorOccurred } from '../events/SourceErrorOccurred';

/**
 * Source Aggregate Root representing a content source (RSS, Telegram, Calendar).
 *
 * The Source is responsible for managing external content sources,
 * their configuration, monitoring status, and fetch operations.
 *
 * Business Rules:
 * - Sources must have a name and type
 * - RSS and Telegram sources must have a valid URL
 * - Status transitions must follow valid workflows
 * - Configuration must be valid for the source type
 * - Sources track their fetch history and errors
 *
 * Aggregate Invariants:
 * - Source must always have valid name and type
 * - URL must be present and valid for RSS/Telegram sources
 * - Status transitions must be valid
 * - Configuration must match source type requirements
 */
export class Source extends AggregateRoot<SourceId> {
  private _name: SourceName;
  private _type: SourceType;
  private _status: SourceStatus;
  private _url?: SourceUrl;
  private _defaultCategory?: string;
  private _configuration?: SourceConfiguration;
  private _metadata?: SourceMetadata;
  private _lastFetchAt?: Date;
  private _lastErrorAt?: Date;
  private _lastError?: string;

  constructor(
    id: SourceId,
    name: SourceName,
    type: SourceType,
    status: SourceStatus = SourceStatus.active(),
    url?: SourceUrl,
    defaultCategory?: string,
    configuration?: SourceConfiguration,
    metadata?: SourceMetadata,
    lastFetchAt?: Date,
    lastErrorAt?: Date,
    lastError?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._type = type;
    this._status = status;
    this._url = url;
    this._defaultCategory = defaultCategory;
    this._configuration = configuration;
    this._metadata = metadata;
    this._lastFetchAt = lastFetchAt;
    this._lastErrorAt = lastErrorAt;
    this._lastError = lastError;

    this.validateInvariants();
  }

  /**
   * Creates a new RSS source
   */
  static createRssSource(
    name: SourceName,
    url: SourceUrl,
    configuration?: RssConfiguration,
    defaultCategory?: string
  ): Source {
    const id = SourceId.generate();
    const type = SourceType.rss();

    const source = new Source(
      id,
      name,
      type,
      SourceStatus.active(),
      url,
      defaultCategory,
      configuration
    );

    source.addDomainEvent(
      new SourceCreated(
        id.getValue(),
        name.getValue(),
        type.getValue(),
        url.getValue()
      )
    );

    return source;
  }

  /**
   * Creates a new Telegram source
   */
  static createTelegramSource(
    name: SourceName,
    url: SourceUrl,
    configuration?: TelegramConfiguration,
    defaultCategory?: string
  ): Source {
    const id = SourceId.generate();
    const type = SourceType.telegram();

    const source = new Source(
      id,
      name,
      type,
      SourceStatus.active(),
      url,
      defaultCategory,
      configuration
    );

    source.addDomainEvent(
      new SourceCreated(
        id.getValue(),
        name.getValue(),
        type.getValue(),
        url.getValue()
      )
    );

    return source;
  }

  /**
   * Creates a new Calendar source
   */
  static createCalendarSource(
    name: SourceName,
    configuration?: CalendarConfiguration,
    defaultCategory?: string
  ): Source {
    const id = SourceId.generate();
    const type = SourceType.calendar();

    const source = new Source(
      id,
      name,
      type,
      SourceStatus.active(),
      undefined,
      defaultCategory,
      configuration
    );

    source.addDomainEvent(
      new SourceCreated(
        id.getValue(),
        name.getValue(),
        type.getValue()
      )
    );

    return source;
  }

  // Getters
  get name(): SourceName {
    return this._name;
  }

  get type(): SourceType {
    return this._type;
  }

  get status(): SourceStatus {
    return this._status;
  }

  get url(): SourceUrl | undefined {
    return this._url;
  }

  get defaultCategory(): string | undefined {
    return this._defaultCategory;
  }

  get configuration(): SourceConfiguration | undefined {
    return this._configuration;
  }

  get metadata(): SourceMetadata | undefined {
    return this._metadata;
  }

  get lastFetchAt(): Date | undefined {
    return this._lastFetchAt ? new Date(this._lastFetchAt) : undefined;
  }

  get lastErrorAt(): Date | undefined {
    return this._lastErrorAt ? new Date(this._lastErrorAt) : undefined;
  }

  get lastError(): string | undefined {
    return this._lastError;
  }

  /**
   * Updates the source name
   */
  updateName(name: SourceName): void {
    const previousName = this._name.getValue();
    this._name = name;
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'general',
        { name: { from: previousName, to: name.getValue() } }
      )
    );
  }

  /**
   * Updates the source URL (only for RSS/Telegram sources)
   */
  updateUrl(url: SourceUrl): void {
    if (!this._type.requiresUrl()) {
      throw new Error(`Sources of type ${this._type.getValue()} do not support URLs`);
    }

    const previousUrl = this._url?.getValue();
    this._url = url;
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'general',
        { url: { from: previousUrl, to: url.getValue() } }
      )
    );

    this.validateInvariants();
  }

  /**
   * Updates the source default category
   */
  updateDefaultCategory(defaultCategory?: string): void {
    const previousCategory = this._defaultCategory;
    this._defaultCategory = defaultCategory;
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'general',
        { defaultCategory: { from: previousCategory, to: defaultCategory } }
      )
    );
  }

  /**
   * Updates the source configuration
   */
  updateConfiguration(configuration: SourceConfiguration): void {
    this._configuration = configuration;
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'configuration',
        { configuration }
      )
    );
  }

  /**
   * Pauses the source
   */
  pause(): void {
    if (!this._status.canTransitionTo(SourceStatus.paused())) {
      throw new Error(`Cannot pause source in ${this._status.getValue()} status`);
    }

    const previousStatus = this._status.getValue();
    this._status = SourceStatus.paused();
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'status',
        { status: { from: previousStatus, to: 'paused' } }
      )
    );
  }

  /**
   * Activates the source
   */
  activate(): void {
    if (!this._status.canTransitionTo(SourceStatus.active())) {
      throw new Error(`Cannot activate source in ${this._status.getValue()} status`);
    }

    const previousStatus = this._status.getValue();
    this._status = SourceStatus.active();
    this._lastError = undefined;
    this._lastErrorAt = undefined;
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'status',
        { status: { from: previousStatus, to: 'active' } }
      )
    );
  }

  /**
   * Archives the source
   */
  archive(): void {
    if (!this._status.canTransitionTo(SourceStatus.archived())) {
      throw new Error(`Cannot archive source in ${this._status.getValue()} status`);
    }

    const previousStatus = this._status.getValue();
    this._status = SourceStatus.archived();
    this.markAsUpdated();

    this.addDomainEvent(
      new SourceUpdated(
        this.id.getValue(),
        'status',
        { status: { from: previousStatus, to: 'archived' } }
      )
    );
  }

  /**
   * Records a successful fetch operation
   * 🚨 CRITICAL: Does NOT overwrite source configuration, only updates fetch metadata
   */
  recordSuccessfulFetch(
    fetchedItems: number,
    newItems: number,
    fetchDuration: number,
    metadata?: Record<string, any>
  ): void {
    this._lastFetchAt = new Date();
    this._lastError = undefined;
    this._lastErrorAt = undefined;

    // 🚨 CRITICAL FIX: Update ONLY metadata, preserve configuration
    // The configuration field contains user settings like autoGenerate
    // and MUST NOT be overwritten by fetch operations
    this.updateMetadata({
      ...this._metadata,
      lastFetch: {
        timestamp: this._lastFetchAt,
        fetchedItems,
        newItems,
        duration: fetchDuration,
        ...metadata
      },
      totalFetches: (this._metadata?.totalFetches || 0) + 1,
      totalItems: (this._metadata?.totalItems || 0) + fetchedItems,
      totalNewItems: (this._metadata?.totalNewItems || 0) + newItems
    });

    // If source was in error state, reactivate it
    if (this._status.isError()) {
      this._status = SourceStatus.active();
    }

    this.markAsUpdated();

    this.addDomainEvent(
      new SourceFetched(
        this.id.getValue(),
        fetchedItems,
        newItems,
        fetchDuration,
        metadata
      )
    );
  }

  /**
   * Records an error during fetch operation
   */
  recordError(
    errorType: 'fetch' | 'parse' | 'validation' | 'network' | 'auth' | 'unknown',
    errorMessage: string,
    errorCode?: string,
    metadata?: Record<string, any>
  ): void {
    this._lastError = errorMessage;
    this._lastErrorAt = new Date();
    this._status = SourceStatus.error();

    // Update error metadata
    this.updateMetadata({
      ...this._metadata,
      lastError: {
        timestamp: this._lastErrorAt,
        type: errorType,
        message: errorMessage,
        code: errorCode,
        ...metadata
      },
      totalErrors: (this._metadata?.totalErrors || 0) + 1
    });

    this.markAsUpdated();

    this.addDomainEvent(
      new SourceErrorOccurred(
        this.id.getValue(),
        errorType,
        errorMessage,
        errorCode,
        metadata
      )
    );
  }

  /**
   * Checks if the source is ready for fetching
   */
  isReadyForFetch(): boolean {
    return this._status.isOperational();
  }

  /**
   * Checks if the source should auto-generate articles from new content
   */
  shouldAutoGenerate(): boolean {
    return this._configuration?.autoGenerate ?? false;
  }

  /**
   * Checks if the source needs attention (has errors or hasn't been fetched recently)
   */
  needsAttention(): boolean {
    if (this._status.isError()) {
      return true;
    }

    // Check if source hasn't been fetched recently (configurable threshold)
    const fetchThreshold = this.getFetchThresholdHours();
    if (fetchThreshold > 0 && this._lastFetchAt) {
      const hoursSinceLastFetch = (Date.now() - this._lastFetchAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastFetch > fetchThreshold;
    }

    return false;
  }

  /**
   * Gets the recommended fetch interval in minutes
   */
  getRecommendedFetchInterval(): number {
    const config = this._configuration;
    if (config && 'pollingInterval' in config) {
      return config.pollingInterval || 60;
    }

    // Default intervals by type
    switch (this._type.getValue()) {
      case 'rss':
        return 60; // 1 hour
      case 'telegram':
        return 15; // 15 minutes
      case 'calendar':
        return 1440; // 24 hours
      default:
        return 60;
    }
  }

  private getFetchThresholdHours(): number {
    const interval = this.getRecommendedFetchInterval();
    return (interval * 2) / 60; // 2x the fetch interval in hours
  }

  private updateMetadata(metadata: SourceMetadata): void {
    this._metadata = metadata;
  }

  /**
   * Returns source summary for listings
   */
  getSummary(): SourceSummary {
    return {
      id: this.id.getValue(),
      name: this._name.getValue(),
      type: this._type.getValue(),
      status: this._status.getValue(),
      url: this._url?.getValue(),
      lastFetchAt: this._lastFetchAt,
      lastErrorAt: this._lastErrorAt,
      lastError: this._lastError,
      needsAttention: this.needsAttention(),
      totalFetches: this._metadata?.totalFetches || 0,
      totalItems: this._metadata?.totalItems || 0,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates aggregate invariants
   */
  protected validateInvariants(): void {
    // RSS and Telegram sources must have a URL
    if (this._type.requiresUrl() && !this._url) {
      throw new Error(`Sources of type ${this._type.getValue()} must have a URL`);
    }

    // Validate URL pattern for specific types
    if (this._url && this._type.requiresUrl()) {
      const pattern = this._type.getValidUrlPattern();
      if (pattern && !pattern.test(this._url.getValue())) {
        throw new Error(`Invalid URL format for ${this._type.getValue()} source`);
      }
    }
  }

  /**
   * Returns the complete source data for JSON serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      name: this._name.getValue(),
      type: this._type.getValue(),
      status: this._status.getValue(),
      url: this._url?.getValue(),
      defaultCategory: this._defaultCategory,
      configuration: this._configuration,
      metadata: this._metadata,
      lastFetchAt: this._lastFetchAt,
      lastErrorAt: this._lastErrorAt,
      lastError: this._lastError,
    };
  }
}

// Configuration interfaces for different source types
export interface SourceConfiguration {
  pollingInterval?: number; // in minutes
  enabled?: boolean;
  autoGenerate?: boolean; // if true, automatically generate articles from new content
}

export interface RssConfiguration extends SourceConfiguration {
  userAgent?: string;
  timeout?: number;
  followRedirects?: boolean;
  maxItems?: number;
  filters?: RssFilters;
}

export interface RssFilters {
  keywords?: string[];
  excludeKeywords?: string[];
  categoryFilters?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface TelegramConfiguration extends SourceConfiguration {
  channelId?: string;
  accessToken?: string;
  maxMessages?: number;
  filters?: TelegramFilters;
}

export interface TelegramFilters {
  keywords?: string[];
  excludeKeywords?: string[];
  messageTypes?: string[];
  minLength?: number;
}

export interface CalendarConfiguration extends SourceConfiguration {
  calendarId?: string;
  lookAheadDays?: number;
  eventTypes?: string[];
  filters?: CalendarFilters;
}

export interface CalendarFilters {
  keywords?: string[];
  excludeKeywords?: string[];
  categories?: string[];
  timeRange?: {
    startHour?: number;
    endHour?: number;
  };
}

// Metadata interface
export interface SourceMetadata {
  totalFetches?: number;
  totalItems?: number;
  totalNewItems?: number;
  totalErrors?: number;
  lastFetch?: {
    timestamp: Date;
    fetchedItems: number;
    newItems: number;
    duration: number;
    [key: string]: any;
  };
  lastError?: {
    timestamp: Date;
    type: string;
    message: string;
    code?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Summary interface for list views
export interface SourceSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  url?: string;
  configuration?: SourceConfiguration;
  lastFetchAt?: Date;
  lastErrorAt?: Date;
  lastError?: string;
  needsAttention: boolean;
  totalFetches: number;
  totalItems: number;
  createdAt: Date;
  updatedAt: Date;
}