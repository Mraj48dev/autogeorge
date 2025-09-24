import { DomainEvent } from '../../../shared/domain/base/DomainEvent';

/**
 * Domain event fired when a publication process starts.
 *
 * This event is useful for:
 * - Logging publication attempts
 * - Tracking publication metrics
 * - Triggering monitoring and alerting
 * - Updating publication statistics
 */
export class PublicationStarted extends DomainEvent {
  constructor(
    public readonly publicationId: string,
    public readonly articleId: string,
    public readonly target: Record<string, any>,
    public readonly startedAt: Date
  ) {
    super('PublicationStarted', {
      publicationId,
      articleId,
      target,
      startedAt,
    });
  }
}