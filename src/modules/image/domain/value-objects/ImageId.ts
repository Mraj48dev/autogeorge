import { ValueObject } from '../../../../shared/domain/base/ValueObject';

/**
 * Image ID Value Object
 */
export class ImageId extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageId cannot be empty');
    }
  }

  get value(): string {
    return super.getValue();
  }

  static create(value: string): ImageId {
    return new ImageId(value.trim());
  }

  static generate(): ImageId {
    // Generate a unique ID using timestamp and random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new ImageId(`img_${timestamp}_${random}`);
  }

  static fromString(value: string): ImageId {
    return ImageId.create(value);
  }

  equals(other: ImageId): boolean {
    return this.getValue() === other.getValue();
  }
}