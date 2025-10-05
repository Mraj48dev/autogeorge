import { DomainEvent } from '../../../../shared/domain/base/DomainEvent';

export class PromptValidated extends DomainEvent {
  public readonly promptId: string;
  public readonly articleId: string;
  public readonly validatedPrompt: string;

  constructor(
    promptId: string,
    articleId: string,
    validatedPrompt: string
  ) {
    super();
    this.promptId = promptId;
    this.articleId = articleId;
    this.validatedPrompt = validatedPrompt;
  }

  getAggregateId(): string {
    return this.promptId;
  }

  getEventName(): string {
    return 'PromptValidated';
  }

  getEventData(): Record<string, any> {
    return {
      promptId: this.promptId,
      articleId: this.articleId,
      validatedPrompt: this.validatedPrompt,
      isReadyForImageGeneration: true,
    };
  }
}