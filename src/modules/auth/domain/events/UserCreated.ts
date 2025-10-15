import { DomainEvent } from '../../../sources/shared/domain/base/DomainEvent';

/**
 * Domain event fired when a new user is created
 */
export class UserCreated implements DomainEvent {
  readonly eventType = 'UserCreated';
  readonly occurredOn: Date;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly externalAuthProviderId: string,
    public readonly externalAuthProvider: string = 'clerk'
  ) {
    this.occurredOn = new Date();
  }
}