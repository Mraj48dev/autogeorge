import { StringValueObject } from '@/shared/domain/base/ValueObject';

/**
 * UserId Value Object
 * Represents a unique user identifier (UUID or similar)
 */
export class UserId extends StringValueObject {
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  protected validate(value: string): void {
    this.validateNotEmpty(value);

    // Allow both UUID and NextAuth string IDs
    if (!this.isValidId(value)) {
      throw new Error('UserId must be a valid UUID or NextAuth ID');
    }
  }

  private isValidId(value: string): boolean {
    // Check for UUID format
    if (UserId.UUID_REGEX.test(value)) {
      return true;
    }

    // Allow NextAuth.js string IDs (typically alphanumeric)
    if (/^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 8 && value.length <= 64) {
      return true;
    }

    return false;
  }

  /**
   * Creates a UserId from a string value
   */
  static create(value: string): UserId {
    return new UserId(value.trim());
  }

  /**
   * Generates a new random UserId (UUID v4)
   */
  static generate(): UserId {
    // Generate UUID v4
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    return new UserId(uuid);
  }

  /**
   * Checks if this is a UUID format
   */
  isUuid(): boolean {
    return UserId.UUID_REGEX.test(this.value);
  }

  /**
   * Returns a short version of the ID for display purposes
   */
  toShortString(): string {
    return this.value.substring(0, 8);
  }
}