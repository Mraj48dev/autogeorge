/**
 * Base class for Domain Events in Event-Driven Architecture.
 *
 * Domain Events represent something important that happened in the domain.
 * They are used to decouple different parts of the system and enable
 * eventual consistency across bounded contexts.
 *
 * Key characteristics:
 * - Immutable: Events represent facts that have already occurred
 * - Named in past tense: UserRegistered, OrderPlaced, PaymentProcessed
 * - Contain minimal data: Usually just IDs and key attributes
 * - Timestamped: Include when the event occurred
 * - Versioned: Support schema evolution over time
 *
 * Usage:
 * - Publish events when aggregate state changes
 * - Subscribe to events in other bounded contexts
 * - Use for integration between modules
 * - Support event sourcing and audit trails
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly eventVersion: number;
  public readonly aggregateId: string;
  public readonly aggregateType: string;

  /**
   * @param aggregateId ID of the aggregate that generated this event
   * @param aggregateType Type of the aggregate (e.g., 'User', 'Order')
   * @param eventVersion Version of the event schema (for evolution)
   * @param eventId Unique identifier for this event instance
   * @param occurredAt When the event occurred (defaults to now)
   */
  constructor(
    aggregateId: string,
    aggregateType: string,
    eventVersion: number = 1,
    eventId?: string,
    occurredAt?: Date
  ) {
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventVersion = eventVersion;
    this.eventId = eventId || this.generateEventId();
    this.occurredAt = occurredAt || new Date();
  }

  /**
   * Returns the event type name.
   * By default, uses the class name.
   */
  get eventType(): string {
    return this.constructor.name;
  }

  /**
   * Returns event metadata for headers/routing
   */
  get metadata(): EventMetadata {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      occurredAt: this.occurredAt,
    };
  }

  /**
   * Returns the event payload data.
   * Override this method to provide event-specific data.
   */
  abstract getPayload(): Record<string, any>;

  /**
   * Returns the complete event data for serialization
   */
  toJSON(): SerializedEvent {
    return {
      ...this.metadata,
      payload: this.getPayload(),
    };
  }

  /**
   * Creates a correlation ID for tracking related events
   */
  static createCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Metadata common to all domain events
 */
export interface EventMetadata {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
}

/**
 * Serialized event format for persistence and messaging
 */
export interface SerializedEvent extends EventMetadata {
  payload: Record<string, any>;
}

/**
 * Base class for integration events that cross bounded contexts.
 * These events are published to external systems and should be
 * more stable than internal domain events.
 */
export abstract class IntegrationEvent extends DomainEvent {
  public readonly correlationId: string;
  public readonly causationId?: string;

  constructor(
    aggregateId: string,
    aggregateType: string,
    correlationId: string,
    causationId?: string,
    eventVersion: number = 1,
    eventId?: string,
    occurredAt?: Date
  ) {
    super(aggregateId, aggregateType, eventVersion, eventId, occurredAt);
    this.correlationId = correlationId;
    this.causationId = causationId;
  }

  /**
   * Returns integration event metadata with correlation/causation IDs
   */
  get metadata(): IntegrationEventMetadata {
    return {
      ...super.metadata,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }
}

/**
 * Extended metadata for integration events
 */
export interface IntegrationEventMetadata extends EventMetadata {
  correlationId: string;
  causationId?: string;
}