import { ValueObject } from '../../../sources/shared/domain/base/ValueObject';

/**
 * User identifier value object
 * Ensures user IDs are valid and consistent
 */
export class UserId extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }
    if (value.length < 10 || value.length > 30) {
      throw new Error('User ID must be between 10 and 30 characters');
    }
    // Validate CUID format (basic check)
    if (!/^c[a-z0-9]+$/i.test(value)) {
      throw new Error('User ID must be a valid CUID');
    }
  }

  static generate(): UserId {
    // Generate a simple CUID-like ID for now
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return new UserId(`c${timestamp}${random}`);
  }

  static fromString(value: string): UserId {
    return new UserId(value);
  }
}