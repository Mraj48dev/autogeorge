import { DomainEvent } from '../../../../shared/domain/base/DomainEvent';

export class PromptGenerated extends DomainEvent {
  public readonly promptId: string;
  public readonly articleId: string;
  public readonly promptText: string;
  public readonly aiModel: string;

  constructor(
    promptId: string,
    articleId: string,
    promptText: string,
    aiModel: string
  ) {
    super();
    this.promptId = promptId;
    this.articleId = articleId;
    this.promptText = promptText;
    this.aiModel = aiModel;
  }

  getAggregateId(): string {
    return this.promptId;
  }

  getEventName(): string {
    return 'PromptGenerated';
  }

  getEventData(): Record<string, any> {
    return {
      promptId: this.promptId,
      articleId: this.articleId,
      promptText: this.promptText,
      aiModel: this.aiModel,
      characterCount: this.promptText.length,
      wordCount: this.promptText.split(' ').length,
    };
  }
}