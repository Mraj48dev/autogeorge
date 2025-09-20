/**
 * Base class for Domain Events in Domain-Driven Design.
 * Content Module specific implementation - completely independent.
 *
 * Domain Events represent something that happened in the domain that
 * domain experts care about. They are immutable facts about the past.
 *
 * Key characteristics:
 * - Immutable: Events cannot be changed once created
 * - Uniquely identified: Each event has a unique ID
 * - Timestamped: Events record when they occurred
 * - Named with past tense: Events describe what happened
 * - Carry relevant data: Events include all necessary information
 *
 * Usage:
 * - Triggered by Aggregate Roots when business rules are satisfied
 * - Used for inter-bounded context communication
 * - Enable event sourcing and CQRS patterns
 * - Support eventual consistency between aggregates
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly eventVersion: number;

  /**
   * @param aggregateId The ID of the aggregate that generated this event
   * @param eventVersion The version of this event schema (for evolution)
   * @param eventId Unique identifier for this event instance (optional)
   * @param occurredAt When the event occurred (defaults to now)
   */
  constructor(
    aggregateId: string,
    eventVersion: number = 1,
    eventId?: string,
    occurredAt?: Date
  ) {
    this.eventId = eventId || this.generateEventId();
    this.eventType = this.constructor.name;
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt || new Date();
    this.eventVersion = eventVersion;
  }

  /**
   * Returns the event data for serialization.
   * Override this method to include event-specific data.
   */
  abstract getEventData(): Record<string, any>;

  /**
   * Returns the complete event payload including metadata
   */
  toEventPayload(): EventPayload {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt,
      eventVersion: this.eventVersion,
      data: this.getEventData(),
    };
  }

  /**
   * Returns a string representation of the event
   */
  toString(): string {
    return `${this.eventType}(${this.aggregateId}) at ${this.occurredAt.toISOString()}`;
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Interface for the complete event payload
 */
export interface EventPayload {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  eventVersion: number;
  data: Record<string, any>;
}

/**
 * Interface for event handlers that process domain events
 */
export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
  canHandle(eventType: string): boolean;
}

/**
 * Interface for event publishers that distribute domain events
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

/**
 * Interface for event stores that persist domain events
 */
export interface DomainEventStore {
  append(event: DomainEvent): Promise<void>;
  appendMany(events: DomainEvent[]): Promise<void>;
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>;
  getEventsSince(since: Date): Promise<DomainEvent[]>;
}