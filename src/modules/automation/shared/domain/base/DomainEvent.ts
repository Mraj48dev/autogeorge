/**
 * Base interface for domain events in the automation module.
 *
 * Domain events represent something interesting that happened in the domain
 * and can be used to trigger side effects or notify other parts of the system.
 */
export interface DomainEvent {
  /**
   * Unique identifier for the event instance
   */
  eventId: string;

  /**
   * Type of the event (used for routing and handling)
   */
  eventType: string;

  /**
   * When the event occurred
   */
  occurredAt: Date;

  /**
   * Version of the event structure (for schema evolution)
   */
  version: number;

  /**
   * The aggregate root ID that generated this event
   */
  aggregateId: string;

  /**
   * The aggregate type that generated this event
   */
  aggregateType: string;

  /**
   * Event-specific data
   */
  data: Record<string, any>;

  /**
   * Metadata about the event (user, request ID, etc.)
   */
  metadata?: Record<string, any>;
}

/**
 * Event handler interface for processing domain events
 */
export interface DomainEventHandler<T extends DomainEvent> {
  /**
   * Handles a specific type of domain event
   */
  handle(event: T): Promise<void>;

  /**
   * Returns the event type this handler processes
   */
  getEventType(): string;
}

/**
 * Event bus interface for publishing and subscribing to domain events
 */
export interface EventBus {
  /**
   * Publishes a domain event to all registered handlers
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events
   */
  publishMany(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribes a handler to a specific event type
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void;

  /**
   * Unsubscribes a handler from a specific event type
   */
  unsubscribe(eventType: string, handler: DomainEventHandler<any>): void;
}

/**
 * Base implementation for domain events
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly version: number = 1;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly data: Record<string, any>,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
  }
}