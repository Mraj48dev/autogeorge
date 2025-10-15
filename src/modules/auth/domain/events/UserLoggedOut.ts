import { DomainEvent } from '../../../sources/shared/domain/base/DomainEvent';

/**
 * Domain event fired when a user logs out
 */
export class UserLoggedOut implements DomainEvent {
  readonly eventType = 'UserLoggedOut';
  readonly occurredOn: Date;

  constructor(
    public readonly userId: string,
    public readonly logoutTime: Date,
    public readonly authProvider: string = 'clerk'
  ) {
    this.occurredOn = new Date();
  }
}