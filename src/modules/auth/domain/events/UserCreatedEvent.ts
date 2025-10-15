import { DomainEvent } from '@/shared/domain/base/DomainEvent';
import { UserId } from '../value-objects/UserId';
import { Email } from '../value-objects/Email';
import { Role } from '../value-objects/Role';

/**
 * Domain event fired when a new user is created
 */
export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    public readonly role: Role,
    occurredAt?: Date
  ) {
    super('user.created', occurredAt);
  }

  getPayload(): Record<string, any> {
    return {
      userId: this.userId.getValue(),
      email: this.email.getValue(),
      role: this.role.getValue(),
    };
  }
}