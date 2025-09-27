/**
 * Abstract base class for Value Objects in Domain-Driven Design.
 * Content Module specific implementation - completely independent.
 *
 * Value Objects are immutable objects that are defined by their attributes
 * rather than their identity. They encapsulate business rules and validation
 * logic, ensuring invariants are maintained throughout the application.
 *
 * Key characteristics:
 * - Immutable: Once created, values cannot be changed
 * - Equality based on value: Two value objects are equal if all their attributes are equal
 * - Self-validating: Validation happens at construction time
 * - No identity: Unlike entities, value objects don't have an ID
 *
 * Example implementations: Email, UserId, Price, Address
 */
export abstract class ValueObject<T> {
  protected readonly value: T;

  /**
   * @param value The primitive value or object to wrap
   * @throws {Error} If validation fails during construction
   */
  constructor(value: T) {
    this.validate(value);
    this.value = value;
  }

  /**
   * Validates the value according to business rules.
   * Should throw an error if validation fails.
   *
   * @param value The value to validate
   * @throws {Error} If validation fails
   */
  protected abstract validate(value: T): void;

  /**
   * Returns the primitive value
   */
  getValue(): T {
    return this.value;
  }

  /**
   * Checks equality with another value object based on value comparison
   */
  equals(other: ValueObject<T>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false;
    }

    return this.isDeepEqual(this.value, other.value);
  }

  /**
   * Returns a string representation of the value object
   */
  toString(): string {
    return String(this.value);
  }

  /**
   * Returns the primitive value for JSON serialization
   */
  toJSON(): T {
    return this.value;
  }

  /**
   * Deep equality comparison for complex objects
   */
  private isDeepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b;
    }

    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }

    if (a.prototype !== b.prototype) return false;

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      return false;
    }

    return keys.every((k) => this.isDeepEqual(a[k], b[k]));
  }
}

/**
 * Base class for string-based value objects with common validation
 */
export abstract class StringValueObject extends ValueObject<string> {
  protected validateNotEmpty(value?: string): void {
    const val = value ?? this.value;
    if (!val || (typeof val === 'string' && val.trim().length === 0)) {
      throw new Error(`Value cannot be empty`);
    }
  }

  protected validateMaxLength(maxLength: number): void {
    if (this.value.length > maxLength) {
      throw new Error(`Value cannot exceed ${maxLength} characters`);
    }
  }

  protected validateMinLength(minLength: number): void {
    if (this.value.length < minLength) {
      throw new Error(`Value must be at least ${minLength} characters`);
    }
  }

  protected validatePattern(pattern: RegExp, errorMessage: string): void {
    if (!pattern.test(this.value)) {
      throw new Error(`Validation failed: ${errorMessage}`);
    }
  }
}

/**
 * Base class for numeric value objects with common validation
 */
export abstract class NumericValueObject extends ValueObject<number> {
  protected validatePositive(): void {
    if (this.value <= 0) {
      throw new Error(`Value must be positive`);
    }
  }

  protected validateNonNegative(): void {
    if (this.value < 0) {
      throw new Error(`Value cannot be negative`);
    }
  }

  protected validateRange(min: number, max: number): void {
    if (this.value < min || this.value > max) {
      throw new Error(`Value must be between ${min} and ${max}`);
    }
  }

  protected validateInteger(): void {
    if (!Number.isInteger(this.value)) {
      throw new Error(`Value must be an integer`);
    }
  }
}