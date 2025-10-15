import { StringValueObject } from '@/shared/domain/base/ValueObject';

/**
 * Email Value Object
 * Represents a valid email address with strict validation
 */
export class Email extends StringValueObject {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_LENGTH = 254; // RFC 5321 limit

  protected validate(value: string): void {
    this.validateNotEmpty(value);

    // Check max length on the input value, not this.value
    if (value.length > Email.MAX_LENGTH) {
      throw new Error(`Email cannot exceed ${Email.MAX_LENGTH} characters`);
    }

    // Check pattern
    if (!Email.EMAIL_REGEX.test(value)) {
      throw new Error('Email must be a valid email address');
    }
  }

  /**
   * Creates an Email from a string value
   */
  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  /**
   * Returns the domain part of the email
   */
  getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Returns the local part of the email (before @)
   */
  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Checks if the email belongs to a specific domain
   */
  belongsToDomain(domain: string): boolean {
    return this.getDomain().toLowerCase() === domain.toLowerCase();
  }
}