import { DomainEvent } from '../base/DomainEvent';

/**
 * Domain event triggered when a featured image search is initiated
 */
export class FeaturedImageSearched extends DomainEvent {
  constructor(
    public readonly imageId: string,
    public readonly articleId: string,
    public readonly aiPrompt: string,
    public readonly filename: string,
    public readonly altText: string
  ) {
    super();
  }

  getEventName(): string {
    return 'FeaturedImageSearched';
  }

  getEventData(): Record<string, any> {
    return {
      imageId: this.imageId,
      articleId: this.articleId,
      aiPrompt: this.aiPrompt,
      filename: this.filename,
      altText: this.altText,
    };
  }
}