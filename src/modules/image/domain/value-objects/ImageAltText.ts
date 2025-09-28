import { ValueObject } from '../base/ValueObject';

export interface ImageAltTextProps {
  value: string;
}

/**
 * Image Alt Text Value Object
 */
export class ImageAltText extends ValueObject<ImageAltTextProps> {
  get value(): string {
    return this.props.value;
  }

  static create(value: string): ImageAltText {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageAltText cannot be empty');
    }

    const trimmedValue = value.trim();

    // Alt text should be descriptive but not too long (recommended max 125 chars)
    if (trimmedValue.length > 250) {
      throw new Error('ImageAltText is too long (max 250 characters)');
    }

    return new ImageAltText({ value: trimmedValue });
  }

  /**
   * Check if alt text is SEO-friendly
   */
  isSeoFriendly(): boolean {
    const value = this.value.toLowerCase();

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
    return this.value.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Create a SEO-optimized version
   */
  toSeoOptimized(): ImageAltText {
    let optimized = this.value;

    // Remove redundant phrases
    optimized = optimized
      .replace(/^(image of|picture of|photo of)\s+/i, '')
      .replace(/\s+(image|picture|photo)$/i, '');

    // Trim and ensure it's not empty
    optimized = optimized.trim();
    if (optimized.length === 0) {
      optimized = this.value; // Fallback to original
    }

    // Truncate if too long but preserve meaning
    if (optimized.length > 125) {
      optimized = optimized.substring(0, 122) + '...';
    }

    return new ImageAltText({ value: optimized });
  }

  equals(other: ImageAltText): boolean {
    return this.value === other.value;
  }
}