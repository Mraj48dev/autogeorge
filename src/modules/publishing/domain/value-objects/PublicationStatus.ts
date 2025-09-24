import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Value Object representing the status of a publication.
 *
 * PublicationStatus ensures type safety for publication states
 * and provides factory methods for creating valid status instances.
 */
export class PublicationStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = [
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  ] as const;

  private constructor(value: string) {
    super(value);
    this.validate();
  }

  /**
   * Creates a PublicationStatus from a string value
   */
  static fromString(value: string): PublicationStatus {
    return new PublicationStatus(value);
  }

  /**
   * Creates a pending status
   */
  static pending(): PublicationStatus {
    return new PublicationStatus('pending');
  }

  /**
   * Creates a scheduled status
   */
  static scheduled(): PublicationStatus {
    return new PublicationStatus('scheduled');
  }

  /**
   * Creates an in-progress status
   */
  static inProgress(): PublicationStatus {
    return new PublicationStatus('in_progress');
  }

  /**
   * Creates a completed status
   */
  static completed(): PublicationStatus {
    return new PublicationStatus('completed');
  }

  /**
   * Creates a failed status
   */
  static failed(): PublicationStatus {
    return new PublicationStatus('failed');
  }

  /**
   * Creates a cancelled status
   */
  static cancelled(): PublicationStatus {
    return new PublicationStatus('cancelled');
  }

  /**
   * Checks if the status is pending
   */
  isPending(): boolean {
    return this.value === 'pending';
  }

  /**
   * Checks if the status is scheduled
   */
  isScheduled(): boolean {
    return this.value === 'scheduled';
  }

  /**
   * Checks if the status is in progress
   */
  isInProgress(): boolean {
    return this.value === 'in_progress';
  }

  /**
   * Checks if the status is completed
   */
  isCompleted(): boolean {
    return this.value === 'completed';
  }

  /**
   * Checks if the status is failed
   */
  isFailed(): boolean {
    return this.value === 'failed';
  }

  /**
   * Checks if the status is cancelled
   */
  isCancelled(): boolean {
    return this.value === 'cancelled';
  }

  /**
   * Checks if the status is terminal (no further transitions possible)
   */
  isTerminal(): boolean {
    return this.isCompleted() || this.isCancelled();
  }

  /**
   * Checks if the status indicates an active publication
   */
  isActive(): boolean {
    return this.isPending() || this.isScheduled() || this.isInProgress();
  }

  /**
   * Gets all valid statuses
   */
  static getValidStatuses(): readonly string[] {
    return this.VALID_STATUSES;
  }

  /**
   * Validates the status value
   */
  private validate(): void {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('PublicationStatus must be a non-empty string');
    }

    if (!PublicationStatus.VALID_STATUSES.includes(this.value as any)) {
      throw new Error(
        `Invalid publication status: ${this.value}. Valid statuses are: ${PublicationStatus.VALID_STATUSES.join(', ')}`
      );
    }
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.value;
  }
}