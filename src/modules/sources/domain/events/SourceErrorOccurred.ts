import { DomainEvent } from '../../shared/domain/base/DomainEvent';

/**
 * Event published when an error occurs while processing a source
 */
export class SourceErrorOccurred extends DomainEvent {
  constructor(
    public readonly sourceId: string,
    public readonly errorType: 'fetch' | 'parse' | 'validation' | 'network' | 'auth' | 'unknown',
    public readonly errorMessage: string,
    public readonly errorCode?: string,
    public readonly metadata?: Record<string, any>
  ) {
    super();
  }

  getEventName(): string {
    return 'SourceErrorOccurred';
  }

  protected getPayload(): Record<string, any> {
    return {
      sourceId: this.sourceId,
      errorType: this.errorType,
      errorMessage: this.errorMessage,
      errorCode: this.errorCode,
      metadata: this.metadata,
    };
  }
}