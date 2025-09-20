import { DomainEvent } from '../../../../shared/domain/base/DomainEvent';
import { GenerationParameters } from '../entities/Article';
import { ContentStats } from '../value-objects/Content';

/**
 * Domain Event: ArticleGenerated
 *
 * Published when a new article has been successfully generated
 * by the AI content generation system.
 *
 * This event signals to other bounded contexts that:
 * - A new article is available for review/publishing
 * - SEO metadata may need to be generated
 * - Quality checks can be performed
 * - Publishing workflows can be triggered
 */
export class ArticleGenerated extends DomainEvent {
  constructor(
    public readonly articleId: string,
    public readonly title: string,
    public readonly contentStats: ContentStats,
    public readonly sourceId: string,
    public readonly generationParams: GenerationParameters,
    eventId?: string,
    occurredAt?: Date
  ) {
    super(articleId, 'Article', 1, eventId, occurredAt);
  }

  /**
   * Returns the event payload containing article generation details
   */
  getPayload(): Record<string, any> {
    return {
      articleId: this.articleId,
      title: this.title,
      contentStats: this.contentStats,
      sourceId: this.sourceId,
      generationParams: this.generationParams,
    };
  }
}