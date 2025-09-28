import { DomainEvent } from '../base/DomainEvent';

export interface FeaturedImageFailedProps {
  imageId: string;
  articleId: string;
  errorMessage: string;
  timestamp: Date;
}

/**
 * Domain Event: Featured Image Search Failed
 *
 * Triggered when a featured image search fails
 */
export class FeaturedImageFailed extends DomainEvent<FeaturedImageFailedProps> {
  constructor(
    imageId: string,
    articleId: string,
    errorMessage: string
  ) {
    super({
      imageId,
      articleId,
      errorMessage,
      timestamp: new Date(),
    });
  }

  static get eventName(): string {
    return 'FeaturedImageFailed';
  }

  get imageId(): string {
    return this.props.imageId;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get errorMessage(): string {
    return this.props.errorMessage;
  }
}