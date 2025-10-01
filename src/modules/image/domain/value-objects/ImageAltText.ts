import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Image Alt Text Value Object
 */
export class ImageAltText extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageAltText cannot be empty');
    }
    if (value.trim().length > 250) {
      throw new Error('ImageAltText is too long (max 250 characters)');
    }
  }

  static create(value: string): ImageAltText {
    return new ImageAltText(value.trim());
  }

  /**
   * Check if alt text is SEO-friendly
   */
  isSeoFriendly(): boolean {
    const value = this.getValue().toLowerCase();

    // Should not start with "image of" or "picture of"
    if (value.startsWith('image of') || value.startsWith('picture of')) {
      return false;
    }

    // Should be descriptive (at least 10 chars)
    if (value.length < 10) {
      return false;
    }

    // Should not be too long (recommended max 125 chars)
    if (value.length > 125) {
      return false;
    }

    return true;
  }

  /**
   * Get the word count
   */
  getWordCount(): number {
    return this.getValue().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Create a SEO-optimized version
   */
  toSeoOptimized(): ImageAltText {
    let optimized = this.getValue();

    // Remove redundant phrases
    optimized = optimized
      .replace(/^(image of|picture of|photo of)\s+/i, '')
      .replace(/\s+(image|picture|photo)$/i, '');

    // Trim and ensure it's not empty
    optimized = optimized.trim();
    if (optimized.length === 0) {
      optimized = this.getValue(); // Fallback to original
    }

    // Truncate if too long but preserve meaning
    if (optimized.length > 125) {
      optimized = optimized.substring(0, 122) + '...';
    }

    return new ImageAltText(optimized);
  }

  equals(other: ImageAltText): boolean {
    return this.getValue() === other.getValue();
  }
}