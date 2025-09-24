import { DomainEvent } from '../../../../shared/domain/base/DomainEvent';

/**
 * Domain event fired when a publication process completes successfully.
 *
 * This event is useful for:
 * - Logging successful publications
 * - Updating publication statistics
 * - Triggering post-publication workflows
 * - Notifying stakeholders of publication success
 * - Updating content status in other systems
 */
export class PublicationCompleted extends DomainEvent {
  constructor(
    public readonly publicationId: string,
    public readonly articleId: string,
    public readonly target: Record<string, any>,
    public readonly externalId: string,
    public readonly externalUrl: string | undefined,
    public readonly completedAt: Date
  ) {
    super('PublicationCompleted', {
      publicationId,
      articleId,
      target,
      externalId,
      externalUrl,
      completedAt,
    });
  }
}