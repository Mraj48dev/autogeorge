/**
 * Base domain event class for Sources module
 * Maintains consistency with Content module patterns
 */
export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = this.generateEventId();
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract getEventName(): string;

  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      occurredOn: this.occurredOn,
      ...this.getPayload(),
    };
  }

  protected abstract getPayload(): Record<string, any>;
}