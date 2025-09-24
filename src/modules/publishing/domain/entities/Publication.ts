import { AggregateRoot } from '../../../content/shared/domain/base/Entity';
import { PublicationId } from '../value-objects/PublicationId';
import { PublicationStatus } from '../value-objects/PublicationStatus';
import { PublicationTarget } from '../value-objects/PublicationTarget';
import { PublicationStarted } from '../events/PublicationStarted';
import { PublicationCompleted } from '../events/PublicationCompleted';
import { PublicationFailed } from '../events/PublicationFailed';

/**
 * Publication Aggregate Root representing a content publication job.
 *
 * The Publication entity manages the lifecycle of publishing content
 * to external platforms like WordPress, social media, etc.
 *
 * Business Rules:
 * - Publications must have a valid target platform
 * - Status transitions must follow valid workflows
 * - Published content must maintain references to original articles
 * - Failed publications can be retried with updated configurations
 * - Publications must track timing and metadata for audit purposes
 *
 * Aggregate Invariants:
 * - Publication must always have valid article reference
 * - Status transitions must be valid (pending -> in_progress -> completed/failed)
 * - Published articles must have external platform references
 * - Retry counts must not exceed maximum allowed attempts
 */
export class Publication extends AggregateRoot<PublicationId> {
  private _articleId: string;
  private _target: PublicationTarget;
  private _status: PublicationStatus;
  private _externalId?: string; // ID on the target platform
  private _externalUrl?: string; // URL on the target platform
  private _metadata: PublicationMetadata;
  private _error?: PublicationError;
  private _retryCount: number;
  private _maxRetries: number;
  private _scheduledAt?: Date;
  private _startedAt?: Date;
  private _completedAt?: Date;

  constructor(
    id: PublicationId,
    articleId: string,
    target: PublicationTarget,
    metadata: PublicationMetadata,
    status: PublicationStatus = PublicationStatus.pending(),
    maxRetries: number = 3,
    scheduledAt?: Date,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._articleId = articleId;
    this._target = target;
    this._status = status;
    this._metadata = metadata;
    this._retryCount = 0;
    this._maxRetries = maxRetries;
    this._scheduledAt = scheduledAt;

    this.validateInvariants();
  }

  /**
   * Creates a new publication for immediate execution
   */
  static createImmediate(
    articleId: string,
    target: PublicationTarget,
    metadata: PublicationMetadata
  ): Publication {
    const id = PublicationId.generate();
    return new Publication(id, articleId, target, metadata);
  }

  /**
   * Creates a new scheduled publication
   */
  static createScheduled(
    articleId: string,
    target: PublicationTarget,
    metadata: PublicationMetadata,
    scheduledAt: Date
  ): Publication {
    const id = PublicationId.generate();
    return new Publication(id, articleId, target, metadata, PublicationStatus.scheduled(), 3, scheduledAt);
  }

  // Getters
  get articleId(): string {
    return this._articleId;
  }

  get target(): PublicationTarget {
    return this._target;
  }

  get status(): PublicationStatus {
    return this._status;
  }

  get externalId(): string | undefined {
    return this._externalId;
  }

  get externalUrl(): string | undefined {
    return this._externalUrl;
  }

  get metadata(): PublicationMetadata {
    return this._metadata;
  }

  get error(): PublicationError | undefined {
    return this._error;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get maxRetries(): number {
    return this._maxRetries;
  }

  get scheduledAt(): Date | undefined {
    return this._scheduledAt ? new Date(this._scheduledAt) : undefined;
  }

  get startedAt(): Date | undefined {
    return this._startedAt ? new Date(this._startedAt) : undefined;
  }

  get completedAt(): Date | undefined {
    return this._completedAt ? new Date(this._completedAt) : undefined;
  }

  /**
   * Starts the publication process
   */
  start(): void {
    if (!this.canTransitionTo(PublicationStatus.inProgress())) {
      throw new Error(
        `Cannot start publication from status ${this._status.getValue()}`
      );
    }

    this._status = PublicationStatus.inProgress();
    this._startedAt = new Date();
    this.markAsUpdated();

    this.addDomainEvent(
      new PublicationStarted(
        this.id.getValue(),
        this._articleId,
        this._target.toJSON(),
        this._startedAt
      )
    );
  }

  /**
   * Marks the publication as completed
   */
  complete(externalId: string, externalUrl?: string): void {
    if (!this.canTransitionTo(PublicationStatus.completed())) {
      throw new Error(
        `Cannot complete publication from status ${this._status.getValue()}`
      );
    }

    this._status = PublicationStatus.completed();
    this._externalId = externalId;
    this._externalUrl = externalUrl;
    this._completedAt = new Date();
    this._error = undefined; // Clear any previous errors
    this.markAsUpdated();

    this.addDomainEvent(
      new PublicationCompleted(
        this.id.getValue(),
        this._articleId,
        this._target.toJSON(),
        externalId,
        externalUrl,
        this._completedAt
      )
    );
  }

  /**
   * Marks the publication as failed
   */
  fail(error: PublicationError): void {
    this._status = PublicationStatus.failed();
    this._error = error;
    this.markAsUpdated();

    this.addDomainEvent(
      new PublicationFailed(
        this.id.getValue(),
        this._articleId,
        this._target.toJSON(),
        error,
        this._retryCount,
        this.canRetry()
      )
    );
  }

  /**
   * Retries the publication
   */
  retry(): void {
    if (!this.canRetry()) {
      throw new Error(
        `Cannot retry publication: max retries (${this._maxRetries}) exceeded`
      );
    }

    if (!this.canTransitionTo(PublicationStatus.pending())) {
      throw new Error(
        `Cannot retry publication from status ${this._status.getValue()}`
      );
    }

    this._retryCount++;
    this._status = PublicationStatus.pending();
    this._startedAt = undefined;
    this._completedAt = undefined;
    this.markAsUpdated();
  }

  /**
   * Cancels the publication
   */
  cancel(): void {
    if (!this.canTransitionTo(PublicationStatus.cancelled())) {
      throw new Error(
        `Cannot cancel publication from status ${this._status.getValue()}`
      );
    }

    this._status = PublicationStatus.cancelled();
    this.markAsUpdated();
  }

  /**
   * Updates publication metadata
   */
  updateMetadata(metadata: Partial<PublicationMetadata>): void {
    this._metadata = { ...this._metadata, ...metadata };
    this.markAsUpdated();
  }

  /**
   * Checks if the publication can transition to the given status
   */
  canTransitionTo(newStatus: PublicationStatus): boolean {
    const currentStatus = this._status.getValue();
    const targetStatus = newStatus.getValue();

    const validTransitions: Record<string, string[]> = {
      'pending': ['in_progress', 'cancelled'],
      'scheduled': ['pending', 'cancelled'],
      'in_progress': ['completed', 'failed', 'cancelled'],
      'completed': [], // Terminal state
      'failed': ['pending', 'cancelled'], // Can retry
      'cancelled': [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * Checks if the publication can be retried
   */
  canRetry(): boolean {
    return this._status.equals(PublicationStatus.failed()) &&
           this._retryCount < this._maxRetries;
  }

  /**
   * Checks if the publication is ready for execution
   */
  isReadyForExecution(): boolean {
    if (this._status.equals(PublicationStatus.pending())) {
      return true;
    }

    if (this._status.equals(PublicationStatus.scheduled())) {
      return this._scheduledAt ? this._scheduledAt <= new Date() : false;
    }

    return false;
  }

  /**
   * Checks if the publication is in a terminal state
   */
  isTerminal(): boolean {
    return this._status.equals(PublicationStatus.completed()) ||
           this._status.equals(PublicationStatus.cancelled());
  }

  /**
   * Gets publication duration in milliseconds
   */
  getDuration(): number | undefined {
    if (!this._startedAt) return undefined;
    
    const endTime = this._completedAt || new Date();
    return endTime.getTime() - this._startedAt.getTime();
  }

  /**
   * Returns publication summary for listings
   */
  getSummary(): PublicationSummary {
    return {
      id: this.id.getValue(),
      articleId: this._articleId,
      target: this._target.toJSON(),
      status: this._status.getValue(),
      externalId: this._externalId,
      externalUrl: this._externalUrl,
      retryCount: this._retryCount,
      scheduledAt: this._scheduledAt,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      duration: this.getDuration(),
      error: this._error,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates aggregate invariants
   */
  protected validateInvariants(): void {
    // Publication must have valid article reference
    if (!this._articleId || this._articleId.trim().length === 0) {
      throw new Error('Publication must have a valid article ID');
    }

    // Retry count cannot exceed max retries
    if (this._retryCount > this._maxRetries) {
      throw new Error('Retry count cannot exceed maximum retries');
    }

    // Completed publications must have external ID
    if (this._status.equals(PublicationStatus.completed()) && !this._externalId) {
      throw new Error('Completed publications must have an external ID');
    }

    // Scheduled publications must have a scheduled date
    if (this._status.equals(PublicationStatus.scheduled()) && !this._scheduledAt) {
      throw new Error('Scheduled publications must have a scheduled date');
    }

    // In-progress publications must have a start time
    if (this._status.equals(PublicationStatus.inProgress()) && !this._startedAt) {
      throw new Error('In-progress publications must have a start time');
    }

    // Completed publications must have a completion time
    if (this._status.equals(PublicationStatus.completed()) && !this._completedAt) {
      throw new Error('Completed publications must have a completion time');
    }
  }

  /**
   * Returns the complete publication data for JSON serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      articleId: this._articleId,
      target: this._target.toJSON(),
      status: this._status.getValue(),
      externalId: this._externalId,
      externalUrl: this._externalUrl,
      metadata: this._metadata,
      error: this._error,
      retryCount: this._retryCount,
      maxRetries: this._maxRetries,
      scheduledAt: this._scheduledAt,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      duration: this.getDuration(),
    };
  }
}

/**
 * Metadata for publication configuration
 */
export interface PublicationMetadata {
  title?: string;
  content?: string;
  excerpt?: string;
  featuredImageUrl?: string;
  tags?: string[];
  categories?: string[];
  customFields?: Record<string, any>;
  seoTitle?: string;
  seoDescription?: string;
  publishImmediately?: boolean;
  notifySubscribers?: boolean;
}

/**
 * Error information for failed publications
 */
export interface PublicationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  isRetryable: boolean;
}

/**
 * Publication summary for list views
 */
export interface PublicationSummary {
  id: string;
  articleId: string;
  target: Record<string, any>;
  status: string;
  externalId?: string;
  externalUrl?: string;
  retryCount: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: PublicationError;
  createdAt: Date;
  updatedAt: Date;
}