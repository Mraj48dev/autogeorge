import { ValueObject } from '../base/ValueObject';

export interface ImageUrlProps {
  value: string;
}

/**
 * Image URL Value Object
 */
export class ImageUrl extends ValueObject<ImageUrlProps> {
  get value(): string {
    return this.props.value;
  }

  static create(value: string): ImageUrl {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageUrl cannot be empty');
    }

    const trimmedValue = value.trim();

    // Basic URL validation
    if (!this.isValidUrl(trimmedValue)) {
      throw new Error('Invalid URL format');
    }

    return new ImageUrl({ value: trimmedValue });
  }

  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if this is an image URL based on extension
   */
  isImageUrl(): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const url = this.value.toLowerCase();
    return imageExtensions.some(ext => url.includes(ext));
  }

  /**
   * Get the domain of the URL
   */
  getDomain(): string {
    try {
      const urlObj = new URL(this.value);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  equals(other: ImageUrl): boolean {
    return this.value === other.value;
  }
}