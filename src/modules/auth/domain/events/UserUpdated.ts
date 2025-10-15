import { DomainEvent } from '../../../sources/shared/domain/base/DomainEvent';

/**
 * Domain event fired when user information is updated
 */
export class UserUpdated implements DomainEvent {
  readonly eventType = 'UserUpdated';
  readonly occurredOn: Date;

  constructor(
    public readonly userId: string,
    public readonly updateType: 'profile' | 'role' | 'status',
    public readonly changes: Record<string, any>
  ) {
    this.occurredOn = new Date();
  }
}