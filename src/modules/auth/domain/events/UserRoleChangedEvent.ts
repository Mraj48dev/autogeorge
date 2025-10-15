import { DomainEvent } from '@/shared/domain/base/DomainEvent';
import { UserId } from '../value-objects/UserId';
import { Role } from '../value-objects/Role';

/**
 * Domain event fired when a user's role is changed
 */
export class UserRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: UserId,
    public readonly oldRole: Role,
    public readonly newRole: Role,
    occurredAt?: Date
  ) {
    super('user.role_changed', occurredAt);
  }

  getPayload(): Record<string, any> {
    return {
      userId: this.userId.getValue(),
      oldRole: this.oldRole.getValue(),
      newRole: this.newRole.getValue(),
    };
  }
}