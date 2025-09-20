import { ValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Source identifier value object
 * Ensures source IDs are valid and consistent
 */
export class SourceId extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Source ID cannot be empty');
    }
    if (value.length < 10 || value.length > 30) {
      throw new Error('Source ID must be between 10 and 30 characters');
    }
    // Validate CUID format (basic check)
    if (!/^c[a-z0-9]+$/i.test(value)) {
      throw new Error('Source ID must be a valid CUID');
    }
  }

  static generate(): SourceId {
    // Generate a simple CUID-like ID for now
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return new SourceId(`c${timestamp}${random}`);
  }

  static fromString(value: string): SourceId {
    return new SourceId(value);
  }
}