import { EventBus, DomainEvent, DomainEventHandler } from '../../shared/domain/base/DomainEvent';
import { Logger } from '../../shared/infrastructure/logger/Logger';

/**
 * In-memory event bus implementation.
 *
 * This provides a simple, synchronous event bus for communication between modules.
 * In a production system, this could be replaced with a more robust solution
 * like Redis, RabbitMQ, or AWS EventBridge.
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, DomainEventHandler<any>[]> = new Map();

  constructor(private readonly logger: Logger) {}

  /**
   * Publishes a single domain event to all registered handlers
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType) || [];

    this.logger.info('Publishing domain event', {
      eventType,
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      handlerCount: handlers.length
    });

    if (handlers.length === 0) {
      this.logger.warn('No handlers registered for event type', { eventType });
      return;
    }

    // Execute all handlers concurrently
    const handlerPromises = handlers.map(async (handler) => {
      try {
        const startTime = Date.now();
        await handler.handle(event);
        const duration = Date.now() - startTime;

        this.logger.info('Event handler completed successfully', {
          eventType,
          eventId: event.eventId,
          handlerName: handler.constructor.name,
          duration
        });
      } catch (error) {
        this.logger.error('Event handler failed', {
          eventType,
          eventId: event.eventId,
          handlerName: handler.constructor.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't re-throw - other handlers should still execute
      }
    });

    await Promise.all(handlerPromises);
  }

  /**
   * Publishes multiple domain events sequentially
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    this.logger.info('Publishing multiple domain events', {
      eventCount: events.length,
      eventTypes: events.map(e => e.eventType)
    });

    // Publish events sequentially to maintain order
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribes a handler to a specific event type
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.push(handler);

    this.logger.info('Event handler subscribed', {
      eventType,
      handlerName: handler.constructor.name,
      totalHandlers: handlers.length
    });
  }

  /**
   * Unsubscribes a handler from a specific event type
   */
  unsubscribe(eventType: string, handler: DomainEventHandler<any>): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);

      this.logger.info('Event handler unsubscribed', {
        eventType,
        handlerName: handler.constructor.name,
        remainingHandlers: handlers.length
      });

      // Clean up empty handler arrays
      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Gets the number of handlers registered for an event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  /**
   * Gets all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clears all handlers (useful for testing)
   */
  clear(): void {
    const eventTypes = this.getRegisteredEventTypes();
    this.handlers.clear();

    this.logger.info('Event bus cleared', {
      clearedEventTypes: eventTypes
    });
  }
}