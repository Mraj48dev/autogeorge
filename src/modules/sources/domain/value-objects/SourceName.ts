import { ValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Source name value object
 * Ensures source names are valid and meaningful
 */
export class SourceName extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Source name cannot be empty');
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      throw new Error('Source name must be at least 2 characters long');
    }

    if (trimmed.length > 100) {
      throw new Error('Source name cannot exceed 100 characters');
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_\.@]+$/.test(trimmed)) {
      throw new Error('Source name contains invalid characters');
    }
  }

  static fromString(value: string): SourceName {
    return new SourceName(value.trim());
  }

  getDisplayName(): string {
    return this._value;
  }

  getSlug(): string {
    return this._value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}