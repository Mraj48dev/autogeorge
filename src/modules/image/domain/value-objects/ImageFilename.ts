import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Image Filename Value Object
 */
export class ImageFilename extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageFilename cannot be empty');
    }
  }

  get value(): string {
    return this.getValue();
  }

  static create(value: string): ImageFilename {
    const sanitized = this.sanitizeFilename(value.trim());

    if (sanitized.length === 0) {
      throw new Error('ImageFilename cannot be empty after sanitization');
    }

    return new ImageFilename(sanitized);
  }

  private static sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for filenames
    let sanitized = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Ensure it has an extension, default to .jpg if none
    if (!sanitized.includes('.')) {
      sanitized += '.jpg';
    }

    // Ensure it's not too long (max 255 chars for most filesystems)
    if (sanitized.length > 255) {
      const extension = sanitized.substring(sanitized.lastIndexOf('.'));
      const basename = sanitized.substring(0, 255 - extension.length);
      sanitized = basename + extension;
    }

    return sanitized;
  }

  /**
   * Get the file extension
   */
  getExtension(): string {
    const lastDot = this.value.lastIndexOf('.');
    return lastDot !== -1 ? this.value.substring(lastDot) : '';
  }

  /**
   * Get the basename without extension
   */
  getBasename(): string {
    const lastDot = this.value.lastIndexOf('.');
    return lastDot !== -1 ? this.value.substring(0, lastDot) : this.value;
  }

  /**
   * Check if this is a valid image filename
   */
  isImageFile(): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const extension = this.getExtension().toLowerCase();
    return imageExtensions.includes(extension);
  }

  equals(other: ImageFilename): boolean {
    return this.value === other.value;
  }
}