import { BaseDomainEvent } from '../../../automation/shared/domain/base/DomainEvent';

/**
 * Domain event published when new feed items are detected from a source.
 *
 * This event is published by the sources module and can be consumed by
 * the automation module to trigger article generation or other actions.
 */
export class NewFeedItemsDetectedEvent extends BaseDomainEvent {
  public static readonly EVENT_TYPE = 'sources.feed_items.new_items_detected';

  constructor(
    sourceId: string,
    data: NewFeedItemsDetectedEventData,
    metadata?: Record<string, any>
  ) {
    super(
      NewFeedItemsDetectedEvent.EVENT_TYPE,
      sourceId,
      'source',
      data,
      metadata
    );
  }

  /**
   * Factory method to create the event from source data
   */
  static create(
    sourceId: string,
    sourceName: string,
    sourceType: string,
    sourceConfiguration: Record<string, any>,
    newFeedItems: NewFeedItemEventData[]
  ): NewFeedItemsDetectedEvent {
    const data: NewFeedItemsDetectedEventData = {
      sourceId,
      sourceName,
      sourceType,
      sourceConfiguration,
      newFeedItems,
      detectedAt: new Date().toISOString(),
      totalNewItems: newFeedItems.length
    };

    const metadata = {
      sourceType,
      feedItemCount: newFeedItems.length,
      hasAutoGeneration: sourceConfiguration.autoGenerate === true
    };

    return new NewFeedItemsDetectedEvent(sourceId, data, metadata);
  }
}

export interface NewFeedItemsDetectedEventData {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  sourceConfiguration: Record<string, any>;
  newFeedItems: NewFeedItemEventData[];
  detectedAt: string;
  totalNewItems: number;
}

export interface NewFeedItemEventData {
  id: string;
  guid?: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: string;
  fetchedAt: string;
}