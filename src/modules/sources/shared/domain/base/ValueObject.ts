/**
 * Base Value Object class for Sources module
 * Immutable objects that represent domain concepts
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = value;
  }

  getValue(): T {
    return this._value;
  }

  equals(other: ValueObject<T>): boolean {
    if (this === other) return true;
    if (!(other instanceof ValueObject)) return false;
    return this.deepEquals(this._value, other._value);
  }

  protected abstract validate(value: T): void;

  private deepEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEquals(a[key], b[key])) return false;
      }
      return true;
    }

    return false;
  }

  toJSON(): T {
    return this._value;
  }
}