import { DomainEvent } from '../../../../shared/domain/base/DomainEvent';
import { PublicationError } from '../entities/Publication';

/**
 * Domain event fired when a publication process fails.
 *
 * This event is useful for:
 * - Logging publication failures
 * - Triggering retry mechanisms
 * - Alerting system administrators
 * - Updating error statistics
 * - Initiating failure recovery workflows
 */
export class PublicationFailed extends DomainEvent {
  constructor(
    public readonly publicationId: string,
    public readonly articleId: string,
    public readonly target: Record<string, any>,
    public readonly error: PublicationError,
    public readonly retryCount: number,
    public readonly canRetry: boolean
  ) {
    super('PublicationFailed', {
      publicationId,
      articleId,
      target,
      error,
      retryCount,
      canRetry,
    });
  }
}