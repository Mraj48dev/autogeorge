import { ValueObject } from '../../../sources/shared/domain/base/ValueObject';

/**
 * User name value object
 * Ensures user names are valid and consistent
 */
export class UserName extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    const name = value.trim();

    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    if (name.length > 100) {
      throw new Error('Name is too long (max 100 characters)');
    }

    // Basic validation - no special characters except spaces, apostrophes, hyphens
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      throw new Error('Name can only contain letters, spaces, apostrophes, and hyphens');
    }
  }

  /**
   * Returns the normalized name (trimmed, proper case)
   */
  getValue(): string {
    return super.getValue().trim();
  }

  static fromString(value: string): UserName {
    return new UserName(value);
  }
}