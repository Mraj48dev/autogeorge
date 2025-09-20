import { DomainEvent } from '../../shared/domain/base/DomainEvent';

/**
 * Event published when content is successfully fetched from a source
 */
export class SourceFetched extends DomainEvent {
  constructor(
    public readonly sourceId: string,
    public readonly fetchedItems: number,
    public readonly newItems: number,
    public readonly fetchDuration: number,
    public readonly metadata?: Record<string, any>
  ) {
    super();
  }

  getEventName(): string {
    return 'SourceFetched';
  }

  protected getPayload(): Record<string, any> {
    return {
      sourceId: this.sourceId,
      fetchedItems: this.fetchedItems,
      newItems: this.newItems,
      fetchDuration: this.fetchDuration,
      metadata: this.metadata,
    };
  }
}