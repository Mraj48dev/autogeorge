import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Value Object representing a unique publication identifier.
 *
 * PublicationId ensures type safety and encapsulates validation
 * logic for publication identifiers. It provides methods for
 * generation, validation, and comparison.
 */
export class PublicationId extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
    this.validate();
  }

  /**
   * Creates a PublicationId from a string value
   */
  static fromString(value: string): PublicationId {
    return new PublicationId(value);
  }

  /**
   * Generates a new unique PublicationId
   */
  static generate(): PublicationId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const id = `pub_${timestamp}_${random}`;
    return new PublicationId(id);
  }

  /**
   * Validates the publication ID format
   */
  private validate(): void {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('PublicationId must be a non-empty string');
    }

    if (this.value.length < 3 || this.value.length > 50) {
      throw new Error('PublicationId must be between 3 and 50 characters');
    }

    // Allow alphanumeric characters, underscores, and hyphens
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(this.value)) {
      throw new Error('PublicationId can only contain alphanumeric characters, underscores, and hyphens');
    }
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.value;
  }
}