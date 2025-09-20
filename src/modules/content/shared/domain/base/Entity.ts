/**
 * Abstract base class for Domain Entities in Domain-Driven Design.
 * Content Module specific implementation - completely independent.
 *
 * Entities are objects that have a distinct identity that runs through time
 * and different representations. They are defined by their identity, not their attributes.
 *
 * Key characteristics:
 * - Identity: Each entity has a unique identifier
 * - Mutable: Entity attributes can change over time while maintaining identity
 * - Equality based on identity: Two entities are equal if they have the same ID
 * - Lifecycle: Entities have a lifecycle (created, modified, deleted)
 *
 * This implementation includes:
 * - Domain events for event-driven architecture
 * - Created/updated timestamps for audit trails
 * - Thread-safe equality comparison
 */
import { DomainEvent } from './DomainEvent';

export abstract class Entity<TId> {
  private readonly _id: TId;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  /**
   * @param id The unique identifier for this entity
   * @param createdAt When the entity was created (defaults to now)
   * @param updatedAt When the entity was last updated (defaults to createdAt)
   */
  constructor(id: TId, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || this._createdAt;
  }

  /**
   * Returns the entity's unique identifier
   */
  get id(): TId {
    return this._id;
  }

  /**
   * Returns when the entity was created
   */
  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Returns when the entity was last updated
   */
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Returns all uncommitted domain events
   */
  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Checks equality with another entity based on ID comparison
   */
  equals(other: Entity<TId>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false;
    }

    return this._id === other._id;
  }

  /**
   * Adds a domain event to be published later
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Clears all uncommitted domain events.
   * Should be called after events are published.
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Marks the entity as updated with current timestamp.
   * Should be called whenever entity state changes.
   */
  protected markAsUpdated(): void {
    this._updatedAt = new Date();
  }

  /**
   * Returns a string representation of the entity
   */
  toString(): string {
    return `${this.constructor.name}(${String(this._id)})`;
  }

  /**
   * Returns the entity data for JSON serialization.
   * Override this method to customize serialization.
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/**
 * Aggregate Root is a special type of Entity that serves as the entry point
 * to an aggregate boundary. It's responsible for maintaining invariants
 * across the entire aggregate and publishing domain events.
 *
 * Key responsibilities:
 * - Enforce aggregate invariants
 * - Control access to aggregate internals
 * - Publish domain events for external consumption
 * - Coordinate changes across aggregate components
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  /**
   * Returns true if the aggregate has uncommitted domain events
   */
  get hasUncommittedEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Template method for validating aggregate invariants.
   * Override this method to implement business rules that span
   * the entire aggregate.
   *
   * @throws {Error} If any invariant is violated
   */
  protected validateInvariants(): void {
    // Default implementation - override in concrete aggregates
  }

  /**
   * Ensures all aggregate invariants are satisfied.
   * Should be called before persisting the aggregate.
   */
  public checkInvariants(): void {
    this.validateInvariants();
  }
}