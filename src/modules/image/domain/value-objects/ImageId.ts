import { ValueObject } from '../base/ValueObject';

export interface ImageIdProps {
  value: string;
}

/**
 * Image ID Value Object
 */
export class ImageId extends ValueObject<ImageIdProps> {
  get value(): string {
    return this.props.value;
  }

  static create(value: string): ImageId {
    if (!value || value.trim().length === 0) {
      throw new Error('ImageId cannot be empty');
    }

    return new ImageId({ value: value.trim() });
  }

  static generate(): ImageId {
    // Generate a unique ID using timestamp and random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new ImageId({ value: `img_${timestamp}_${random}` });
  }

  equals(other: ImageId): boolean {
    return this.value === other.value;
  }
}