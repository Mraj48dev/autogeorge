import { DomainEvent } from '../../shared/domain/base/DomainEvent';

/**
 * Event published when a source is updated
 */
export class SourceUpdated extends DomainEvent {
  constructor(
    public readonly sourceId: string,
    public readonly updateType: 'status' | 'configuration' | 'metadata' | 'general',
    public readonly changes: Record<string, any>
  ) {
    super();
  }

  getEventName(): string {
    return 'SourceUpdated';
  }

  protected getPayload(): Record<string, any> {
    return {
      sourceId: this.sourceId,
      updateType: this.updateType,
      changes: this.changes,
    };
  }
}