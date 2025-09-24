/**
 * Base class for Value Objects in the Publishing module.
 *
 * Value Objects are immutable objects that are defined by their values
 * rather than their identity. They implement equality based on their values.
 */
export abstract class ValueObject<T> {
  protected readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /**
   * Gets the value of this Value Object
   */
  getValue(): T {
    return this.value;
  }

  /**
   * Checks equality with another Value Object
   */
  equals(other: ValueObject<T>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false;
    }

    return this.isEqual(this.value, other.value);
  }

  /**
   * Deep equality check for values
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((item, index) => this.isEqual(item, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) {
        return false;
      }

      return keysA.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Returns a string representation of the value
   */
  toString(): string {
    return String(this.value);
  }
}