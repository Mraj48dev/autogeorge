import { Entity } from '../../../../shared/domain/base/Entity';
import { ImageId } from '../value-objects/ImageId';
import { ImageUrl } from '../value-objects/ImageUrl';
import { ImageFilename } from '../value-objects/ImageFilename';
import { ImageAltText } from '../value-objects/ImageAltText';
import { ImageStatus } from '../value-objects/ImageStatus';
import { FeaturedImageSearched } from '../events/FeaturedImageSearched';
import { FeaturedImageStored } from '../events/FeaturedImageStored';
import { FeaturedImageFailed } from '../events/FeaturedImageFailed';

export interface FeaturedImageProps {
  id: ImageId;
  articleId: string;
  aiPrompt: string;
  filename: ImageFilename;
  altText: ImageAltText;
  url?: ImageUrl;
  status: ImageStatus;
  searchQuery?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FeaturedImage Domain Entity
 *
 * Represents a featured image for an article that can be searched, generated,
 * and stored for use in WordPress publication.
 */
export class FeaturedImage extends Entity<FeaturedImageProps> {
  get id(): ImageId {
    return this.props.id;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get aiPrompt(): string {
    return this.props.aiPrompt;
  }

  get filename(): ImageFilename {
    return this.props.filename;
  }

  get altText(): ImageAltText {
    return this.props.altText;
  }

  get url(): ImageUrl | undefined {
    return this.props.url;
  }

  get status(): ImageStatus {
    return this.props.status;
  }

  get searchQuery(): string | undefined {
    return this.props.searchQuery;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Creates a new featured image request
   */
  static create(
    articleId: string,
    aiPrompt: string,
    filename: string,
    altText: string
  ): FeaturedImage {
    const id = ImageId.generate();
    const now = new Date();

    const featuredImage = new FeaturedImage({
      id,
      articleId,
      aiPrompt,
      filename: ImageFilename.create(filename),
      altText: ImageAltText.create(altText),
      status: ImageStatus.create('pending'),
      createdAt: now,
      updatedAt: now,
    });

    // Raise domain event
    featuredImage.addDomainEvent(
      new FeaturedImageSearched(
        id.value,
        articleId,
        aiPrompt,
        filename,
        altText
      )
    );

    return featuredImage;
  }

  /**
   * Mark as searching with query
   */
  markAsSearching(searchQuery: string): void {
    this.props.status = ImageStatus.create('searching');
    this.props.searchQuery = searchQuery;
    this.props.updatedAt = new Date();
  }

  /**
   * Mark as found and store the URL
   */
  markAsFound(url: string): void {
    this.props.url = ImageUrl.create(url);
    this.props.status = ImageStatus.create('found');
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new FeaturedImageStored(
        this.id.value,
        this.articleId,
        url,
        this.filename.value,
        this.altText.value
      )
    );
  }

  /**
   * Mark as failed with error message
   */
  markAsFailed(errorMessage: string): void {
    this.props.status = ImageStatus.create('failed');
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new FeaturedImageFailed(
        this.id.value,
        this.articleId,
        errorMessage
      )
    );
  }

  /**
   * Check if the image is ready for WordPress upload
   */
  isReadyForWordPress(): boolean {
    return this.status.isFound() && !!this.url;
  }

  /**
   * Get image data for WordPress upload
   */
  getWordPressData() {
    if (!this.isReadyForWordPress()) {
      throw new Error('Image is not ready for WordPress upload');
    }

    return {
      url: this.url!.value,
      filename: this.filename.value,
      altText: this.altText.value,
      title: this.altText.value, // Use alt text as title
    };
  }

  /**
   * Update the image details
   */
  updateDetails(filename?: string, altText?: string): void {
    if (filename) {
      this.props.filename = ImageFilename.create(filename);
    }
    if (altText) {
      this.props.altText = ImageAltText.create(altText);
    }
    this.props.updatedAt = new Date();
  }
}