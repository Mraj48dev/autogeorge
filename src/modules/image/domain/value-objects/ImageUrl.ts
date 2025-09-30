import { ValueObject } from '../../../../shared/domain/base/ValueObject';


/**
 * Image URL Value Object
 */
export class ImageUrl extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageUrl cannot be empty');
    }
    if (!this.isValidUrl(value.trim())) {
      throw new Error('Invalid URL format');
    }
  }

  get value(): string {
    return super.getValue();
  }

  static create(value: string): ImageUrl {
    return new ImageUrl(value.trim());
  }

  private isValidUrl(url: string): boolean {
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
    const url = this.getValue().toLowerCase();
    return imageExtensions.some(ext => url.includes(ext));
  }

  /**
   * Get the domain of the URL
   */
  getDomain(): string {
    try {
      const urlObj = new URL(this.getValue());
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  equals(other: ImageUrl): boolean {
    return this.getValue() === other.getValue();
  }
}