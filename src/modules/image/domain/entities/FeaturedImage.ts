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
export class FeaturedImage extends Entity<ImageId> {
  private readonly props: FeaturedImageProps;

  constructor(props: FeaturedImageProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get id(): ImageId {
    return super.id;
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
    console.log('🔍 [DEBUG] FeaturedImage.create() called with:', {
      articleId, aiPrompt, filename, altText
    });

    const id = ImageId.generate();
    console.log('🔍 [DEBUG] Generated ImageId:', { id, value: id?.getValue() });

    const now = new Date();

    const filenameVO = ImageFilename.create(filename);
    const altTextVO = ImageAltText.create(altText);
    const statusVO = ImageStatus.create('pending');

    console.log('🔍 [DEBUG] Created value objects:', {
      filename: filenameVO?.getValue(),
      altText: altTextVO?.getValue(),
      status: statusVO?.getValue()
    });

    const featuredImage = new FeaturedImage({
      id,
      articleId,
      aiPrompt,
      filename: filenameVO,
      altText: altTextVO,
      status: statusVO,
      createdAt: now,
      updatedAt: now,
    });

    console.log('🔍 [DEBUG] Created FeaturedImage:', {
      hasImage: !!featuredImage,
      hasId: !!featuredImage.id,
      idValue: featuredImage.id?.getValue()
    });

    // Raise domain event
    featuredImage.addDomainEvent(
      new FeaturedImageSearched(
        id.getValue(),
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
        this.id.getValue(),
        this.articleId,
        url,
        this.filename.getValue(),
        this.altText.getValue()
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
        this.id.getValue(),
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
      url: this.url!.getValue(),
      filename: this.filename.getValue(),
      altText: this.altText.getValue(),
      title: this.altText.getValue(), // Use alt text as title
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