/**
 * Base class for Domain Events
 */
export abstract class DomainEvent<T = any> {
  public readonly props: T;
  public readonly occurredAt: Date;

  constructor(props: T) {
    this.props = props;
    this.occurredAt = new Date();
  }

  static get eventName(): string {
    throw new Error('eventName must be implemented by concrete event classes');
  }
}