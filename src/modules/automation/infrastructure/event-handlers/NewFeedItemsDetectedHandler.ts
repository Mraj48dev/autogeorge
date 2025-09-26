import { DomainEventHandler } from '../../shared/domain/base/DomainEvent';
import { Logger } from '../../shared/infrastructure/logger/Logger';
import { HandleContentAutomation } from '../../application/use-cases/HandleContentAutomation';
import { AutomationTriggerType } from '../../domain/entities/AutomationRule';

/**
 * Event handler for NewFeedItemsDetectedEvent.
 *
 * This handler bridges the gap between the sources module and the automation module.
 * When new feed items are detected, this handler evaluates automation rules and
 * triggers appropriate actions (like article generation).
 */
export class NewFeedItemsDetectedHandler implements DomainEventHandler<NewFeedItemsDetectedEvent> {
  constructor(
    private readonly handleContentAutomation: HandleContentAutomation,
    private readonly logger: Logger
  ) {}

  async handle(event: NewFeedItemsDetectedEvent): Promise<void> {
    try {
      this.logger.info('Processing NewFeedItemsDetectedEvent', {
        sourceId: event.aggregateId,
        eventId: event.eventId,
        feedItemCount: event.data.totalNewItems,
        hasAutoGeneration: event.metadata?.hasAutoGeneration
      });

      // Convert event data to automation request format
      const automationRequest = {
        sourceId: event.data.sourceId,
        feedItems: event.data.newFeedItems.map(item => ({
          id: item.id,
          guid: item.guid || item.id,
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: new Date(item.publishedAt),
          fetchedAt: new Date(item.fetchedAt)
        })),
        sourceConfiguration: event.data.sourceConfiguration,
        triggerType: AutomationTriggerType.NEW_FEED_ITEMS
      };

      // Execute automation workflow
      const result = await this.handleContentAutomation.execute(automationRequest);

      if (result.isSuccess()) {
        const response = result.value;
        this.logger.info('Content automation completed successfully', {
          sourceId: event.data.sourceId,
          eventId: event.eventId,
          rulesEvaluated: response.rulesEvaluated,
          rulesTriggered: response.rulesTriggered,
          articlesGenerated: response.articlesGenerated,
          duration: response.summary.duration
        });
      } else {
        this.logger.error('Content automation failed', {
          sourceId: event.data.sourceId,
          eventId: event.eventId,
          error: result.error.message
        });
      }

    } catch (error) {
      this.logger.error('Failed to handle NewFeedItemsDetectedEvent', {
        sourceId: event.aggregateId,
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't re-throw - event processing should not fail the original operation
    }
  }

  getEventType(): string {
    return 'sources.feed_items.new_items_detected';
  }
}

// Import the event type (will be available once we create the event)
interface NewFeedItemsDetectedEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  data: {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    sourceConfiguration: Record<string, any>;
    newFeedItems: Array<{
      id: string;
      guid?: string;
      title: string;
      content: string;
      url?: string;
      publishedAt: string;
      fetchedAt: string;
    }>;
    totalNewItems: number;
  };
  metadata?: Record<string, any>;
}