import { DomainEvent } from '../../shared/domain/base/DomainEvent';

/**
 * Event published when a new source is created
 */
export class SourceCreated extends DomainEvent {
  constructor(
    public readonly sourceId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly url?: string
  ) {
    super();
  }

  getEventName(): string {
    return 'SourceCreated';
  }

  protected getPayload(): Record<string, any> {
    return {
      sourceId: this.sourceId,
      name: this.name,
      type: this.type,
      url: this.url,
    };
  }
}