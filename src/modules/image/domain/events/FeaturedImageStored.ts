import { DomainEvent } from '../base/DomainEvent';

export interface FeaturedImageStoredProps {
  imageId: string;
  articleId: string;
  imageUrl: string;
  filename: string;
  altText: string;
  timestamp: Date;
}

/**
 * Domain Event: Featured Image Successfully Found and Stored
 *
 * Triggered when a featured image has been successfully found and stored
 */
export class FeaturedImageStored extends DomainEvent<FeaturedImageStoredProps> {
  constructor(
    imageId: string,
    articleId: string,
    imageUrl: string,
    filename: string,
    altText: string
  ) {
    super({
      imageId,
      articleId,
      imageUrl,
      filename,
      altText,
      timestamp: new Date(),
    });
  }

  static get eventName(): string {
    return 'FeaturedImageStored';
  }

  get imageId(): string {
    return this.props.imageId;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get filename(): string {
    return this.props.filename;
  }

  get altText(): string {
    return this.props.altText;
  }
}