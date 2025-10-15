import { ValueObject } from '../../../sources/shared/domain/base/ValueObject';

/**
 * User status value object
 * Defines user account status and state transitions
 */
export class UserStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = ['active', 'suspended', 'inactive', 'pending'] as const;
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['active', 'inactive'],
    active: ['suspended', 'inactive'],
    suspended: ['active', 'inactive'],
    inactive: ['active']
  };

  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Status cannot be empty');
    }

    const status = value.trim().toLowerCase();
    if (!UserStatus.VALID_STATUSES.includes(status as any)) {
      throw new Error(`Invalid status: ${status}. Valid statuses are: ${UserStatus.VALID_STATUSES.join(', ')}`);
    }
  }

  getValue(): string {
    return super.getValue().trim().toLowerCase();
  }

  static active(): UserStatus {
    return new UserStatus('active');
  }

  static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  static inactive(): UserStatus {
    return new UserStatus('inactive');
  }

  static pending(): UserStatus {
    return new UserStatus('pending');
  }

  static fromString(value: string): UserStatus {
    return new UserStatus(value);
  }

  /**
   * Checks if the user is active and can access the platform
   */
  isActive(): boolean {
    return this.getValue() === 'active';
  }

  /**
   * Checks if the user is suspended
   */
  isSuspended(): boolean {
    return this.getValue() === 'suspended';
  }

  /**
   * Checks if the user is inactive
   */
  isInactive(): boolean {
    return this.getValue() === 'inactive';
  }

  /**
   * Checks if the user is pending activation
   */
  isPending(): boolean {
    return this.getValue() === 'pending';
  }

  /**
   * Checks if the status can transition to another status
   */
  canTransitionTo(targetStatus: UserStatus): boolean {
    const currentStatus = this.getValue();
    const target = targetStatus.getValue();

    const allowedTransitions = UserStatus.STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(target);
  }

  /**
   * Gets all valid transition statuses from current status
   */
  getValidTransitions(): string[] {
    const currentStatus = this.getValue();
    return UserStatus.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Checks if the user can perform operations (not suspended or inactive)
   */
  canPerformOperations(): boolean {
    const status = this.getValue();
    return status === 'active' || status === 'pending';
  }

  /**
   * Gets a human-readable description of the status
   */
  getDescription(): string {
    const status = this.getValue();
    switch (status) {
      case 'active':
        return 'Active user with full access';
      case 'suspended':
        return 'Suspended user with restricted access';
      case 'inactive':
        return 'Inactive user account';
      case 'pending':
        return 'Pending activation';
      default:
        return 'Unknown status';
    }
  }
}