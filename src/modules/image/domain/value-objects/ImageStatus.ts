import { ValueObject } from '../../../../shared/domain/base/ValueObject';

export type ImageStatusValue = 'pending' | 'searching' | 'found' | 'failed' | 'uploaded';

/**
 * Image Status Value Object
 */
export class ImageStatus extends ValueObject<ImageStatusValue> {
  protected validate(value: ImageStatusValue): void {
    const validStatuses: ImageStatusValue[] = ['pending', 'searching', 'found', 'failed', 'uploaded'];
    if (!validStatuses.includes(value)) {
      throw new Error(`Invalid image status: ${value}`);
    }
  }

  static create(value: ImageStatusValue): ImageStatus {
    return new ImageStatus(value);
  }

  /**
   * Status check methods
   */
  isPending(): boolean {
    return this.getValue() === 'pending';
  }

  isSearching(): boolean {
    return this.getValue() === 'searching';
  }

  isFound(): boolean {
    return this.getValue() === 'found';
  }

  isFailed(): boolean {
    return this.getValue() === 'failed';
  }

  isUploaded(): boolean {
    return this.getValue() === 'uploaded';
  }

  /**
   * Check if the status allows for retry
   */
  canRetry(): boolean {
    return this.getValue() === 'failed' || this.getValue() === 'pending';
  }

  /**
   * Check if the image is ready for WordPress upload
   */
  isReadyForUpload(): boolean {
    return this.getValue() === 'found';
  }

  /**
   * Get human-readable status
   */
  getDisplayText(): string {
    switch (this.getValue()) {
      case 'pending':
        return 'In attesa';
      case 'searching':
        return 'Ricerca in corso';
      case 'found':
        return 'Immagine trovata';
      case 'failed':
        return 'Ricerca fallita';
      case 'uploaded':
        return 'Caricata su WordPress';
      default:
        return this.getValue();
    }
  }

  /**
   * Get CSS class for status display
   */
  getCssClass(): string {
    switch (this.getValue()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'searching':
        return 'bg-blue-100 text-blue-800';
      case 'found':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'uploaded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  equals(other: ImageStatus): boolean {
    return this.getValue() === other.getValue();
  }
}