import { DomainEvent } from '../../../sources/shared/domain/base/DomainEvent';

/**
 * Domain event fired when a user logs in
 */
export class UserLoggedIn implements DomainEvent {
  readonly eventType = 'UserLoggedIn';
  readonly occurredOn: Date;

  constructor(
    public readonly userId: string,
    public readonly loginTime: Date,
    public readonly authProvider: string = 'clerk'
  ) {
    this.occurredOn = new Date();
  }
}