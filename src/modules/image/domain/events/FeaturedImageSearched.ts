import { DomainEvent } from '../base/DomainEvent';

export interface FeaturedImageSearchedProps {
  imageId: string;
  articleId: string;
  aiPrompt: string;
  filename: string;
  altText: string;
  timestamp: Date;
}

/**
 * Domain Event: Featured Image Search Started
 *
 * Triggered when a featured image search is initiated for an article
 */
export class FeaturedImageSearched extends DomainEvent<FeaturedImageSearchedProps> {
  constructor(
    imageId: string,
    articleId: string,
    aiPrompt: string,
    filename: string,
    altText: string
  ) {
    super({
      imageId,
      articleId,
      aiPrompt,
      filename,
      altText,
      timestamp: new Date(),
    });
  }

  static get eventName(): string {
    return 'FeaturedImageSearched';
  }

  get imageId(): string {
    return this.props.imageId;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get aiPrompt(): string {
    return this.props.aiPrompt;
  }

  get filename(): string {
    return this.props.filename;
  }

  get altText(): string {
    return this.props.altText;
  }
}