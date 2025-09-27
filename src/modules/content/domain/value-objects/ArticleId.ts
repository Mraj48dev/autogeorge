import { StringValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Value Object representing a unique identifier for articles.
 *
 * Business Rules:
 * - Must be a non-empty string
 * - Should follow a consistent format for traceability
 * - Immutable once created
 *
 * This implementation uses UUIDs prefixed with 'art_' for easy identification
 * in logs and debugging scenarios.
 */
export class ArticleId extends StringValueObject {
  private static readonly PREFIX = 'art_';
  private static readonly UUID_PATTERN = /^art_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  protected validate(value: string): void {
    this.validateNotEmpty(value);

    if (!ArticleId.UUID_PATTERN.test(value)) {
      throw new Error(
        'ArticleId must be in format: art_xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      );
    }
  }

  /**
   * Creates a new ArticleId with a generated UUID
   */
  static generate(): ArticleId {
    const uuid = generateUUIDv4();
    return new ArticleId(`${ArticleId.PREFIX}${uuid}`);
  }

  /**
   * Creates an ArticleId from an existing string value
   */
  static fromString(value: string): ArticleId {
    return new ArticleId(value);
  }

  /**
   * Returns just the UUID part without the prefix
   */
  getUuid(): string {
    return this.value.substring(ArticleId.PREFIX.length);
  }

  /**
   * Returns the prefix used for article IDs
   */
  static getPrefix(): string {
    return ArticleId.PREFIX;
  }
}

/**
 * Simple UUID v4 generator
 * In a real application, you might want to use a library like 'uuid'
 */
function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}