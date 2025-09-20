import { DomainEvent } from './DomainEvent';

/**
 * Base Entity class for the Sources module
 * Reuses the same pattern as Content module to maintain consistency
 */
export abstract class Entity<T> {
  protected readonly _id: T;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  constructor(id: T, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get id(): T {
    return this._id;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  protected markAsUpdated(): void {
    this._updatedAt = new Date();
  }

  equals(other: Entity<T>): boolean {
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }

  toJSON(): Record<string, any> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

/**
 * Aggregate Root base class with domain events support
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      domainEvents: this._domainEvents.map(event => event.toJSON()),
    };
  }
}