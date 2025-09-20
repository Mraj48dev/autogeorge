import { DomainEvent } from '../../shared/domain/base/DomainEvent';

/**
 * Domain Event: ArticleUpdated
 *
 * Published when an existing article has been modified.
 * This includes changes to content, metadata, status, or other attributes.
 *
 * This event signals to other bounded contexts that:
 * - Article data has changed and caches may need invalidation
 * - Updated content may require re-processing (SEO, quality checks)
 * - Publishing status changes may trigger workflows
 * - Audit trails should be updated
 */
export class ArticleUpdated extends DomainEvent {
  constructor(
    public readonly articleId: string,
    public readonly updateType: UpdateType,
    public readonly changes: Record<string, any>,
    public readonly previousValues?: Record<string, any>,
    eventId?: string,
    occurredAt?: Date
  ) {
    super(articleId, 'Article', 1, eventId, occurredAt);
  }

  /**
   * Returns the event payload containing update details
   */
  getPayload(): Record<string, any> {
    return {
      articleId: this.articleId,
      updateType: this.updateType,
      changes: this.changes,
      previousValues: this.previousValues,
    };
  }
}

/**
 * Types of updates that can be made to an article
 */
export type UpdateType =
  | 'content'     // Title or content changed
  | 'seo'         // SEO metadata updated
  | 'status'      // Publication status changed
  | 'metadata'    // Other metadata updated
  | 'bulk';       // Multiple fields updated