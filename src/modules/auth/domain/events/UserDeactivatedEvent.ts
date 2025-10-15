import { DomainEvent } from '@/shared/domain/base/DomainEvent';
import { UserId } from '../value-objects/UserId';
import { Email } from '../value-objects/Email';

/**
 * Domain event fired when a user is deactivated
 */
export class UserDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    occurredAt?: Date
  ) {
    super('user.deactivated', occurredAt);
  }

  getPayload(): Record<string, any> {
    return {
      userId: this.userId.getValue(),
      email: this.email.getValue(),
    };
  }
}