import { ValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Source status value object
 * Manages the lifecycle states of sources
 */
export class SourceStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = ['active', 'paused', 'error', 'archived'] as const;

  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Source status cannot be empty');
    }

    const normalizedValue = value.toLowerCase().trim();
    if (!SourceStatus.VALID_STATUSES.includes(normalizedValue as any)) {
      throw new Error(`Invalid source status: ${value}. Valid statuses: ${SourceStatus.VALID_STATUSES.join(', ')}`);
    }
  }

  constructor(value: string) {
    super(value.toLowerCase().trim());
  }

  static active(): SourceStatus {
    return new SourceStatus('active');
  }

  static paused(): SourceStatus {
    return new SourceStatus('paused');
  }

  static error(): SourceStatus {
    return new SourceStatus('error');
  }

  static archived(): SourceStatus {
    return new SourceStatus('archived');
  }

  static fromString(value: string): SourceStatus {
    return new SourceStatus(value);
  }

  isActive(): boolean {
    return this._value === 'active';
  }

  isPaused(): boolean {
    return this._value === 'paused';
  }

  isError(): boolean {
    return this._value === 'error';
  }

  isArchived(): boolean {
    return this._value === 'archived';
  }

  canTransitionTo(newStatus: SourceStatus): boolean {
    const current = this._value;
    const target = newStatus.getValue();

    const validTransitions: Record<string, string[]> = {
      'active': ['paused', 'error', 'archived'],
      'paused': ['active', 'archived'],
      'error': ['active', 'paused', 'archived'],
      'archived': [], // Terminal state
    };

    return validTransitions[current]?.includes(target) ?? false;
  }

  getDisplayName(): string {
    switch (this._value) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'error':
        return 'Error';
      case 'archived':
        return 'Archived';
      default:
        return this._value;
    }
  }

  getColor(): string {
    switch (this._value) {
      case 'active':
        return 'green';
      case 'paused':
        return 'yellow';
      case 'error':
        return 'red';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  }

  isOperational(): boolean {
    return this.isActive();
  }
}