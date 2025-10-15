import { ValueObject } from '../../../sources/shared/domain/base/ValueObject';

/**
 * User email value object
 * Ensures email addresses are valid and consistent
 */
export class UserEmail extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    const email = value.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (email.length > 255) {
      throw new Error('Email is too long (max 255 characters)');
    }
  }

  /**
   * Returns the normalized email (lowercase, trimmed)
   */
  getValue(): string {
    return super.getValue().trim().toLowerCase();
  }

  static fromString(value: string): UserEmail {
    return new UserEmail(value);
  }
}