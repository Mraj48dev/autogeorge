import { Entity } from '../../../../shared/domain/base/Entity';
import { PromptId } from '../value-objects/PromptId';
import { PromptText } from '../value-objects/PromptText';
import { PromptGenerated } from '../events/PromptGenerated';
import { PromptValidated } from '../events/PromptValidated';

export interface ImagePromptProps {
  id: PromptId;
  articleId: string;
  articleTitle: string;
  articleExcerpt: string;
  generatedPrompt: PromptText;
  originalTemplate: string;
  aiModel: string;
  status: 'pending' | 'generated' | 'validated' | 'failed';
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ImagePrompt Domain Entity
 *
 * Represents an AI-generated prompt for image creation based on article content.
 * Manages the lifecycle from generation to validation for DALL-E compatibility.
 */
export class ImagePrompt extends Entity<PromptId> {
  private readonly props: ImagePromptProps;

  constructor(props: ImagePromptProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get id(): PromptId {
    return super.id;
  }

  get articleId(): string {
    return this.props.articleId;
  }

  get articleTitle(): string {
    return this.props.articleTitle;
  }

  get articleExcerpt(): string {
    return this.props.articleExcerpt;
  }

  get generatedPrompt(): PromptText {
    return this.props.generatedPrompt;
  }

  get originalTemplate(): string {
    return this.props.originalTemplate;
  }

  get aiModel(): string {
    return this.props.aiModel;
  }

  get status(): string {
    return this.props.status;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Creates a new image prompt request
   */
  static create(
    articleId: string,
    articleTitle: string,
    articleExcerpt: string,
    template: string,
    aiModel: string = 'gpt-4'
  ): ImagePrompt {
    const id = PromptId.generate();
    const now = new Date();

    const imagePrompt = new ImagePrompt({
      id,
      articleId,
      articleTitle,
      articleExcerpt,
      generatedPrompt: PromptText.create(''), // Will be populated after generation
      originalTemplate: template,
      aiModel,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return imagePrompt;
  }

  /**
   * Mark prompt as successfully generated
   */
  markAsGenerated(promptText: string, metadata?: Record<string, any>): void {
    this.props.generatedPrompt = PromptText.create(promptText);
    this.props.status = 'generated';
    this.props.metadata = metadata;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new PromptGenerated(
        this.id.getValue(),
        this.articleId,
        promptText,
        this.aiModel
      )
    );
  }

  /**
   * Mark prompt as validated (ready for DALL-E)
   */
  markAsValidated(): void {
    if (this.props.status !== 'generated') {
      throw new Error('Cannot validate prompt that is not generated');
    }

    this.props.status = 'validated';
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      new PromptValidated(
        this.id.getValue(),
        this.articleId,
        this.generatedPrompt.getValue()
      )
    );
  }

  /**
   * Mark prompt generation as failed
   */
  markAsFailed(errorMessage: string): void {
    this.props.status = 'failed';
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  /**
   * Update the generated prompt (for user editing in ai_assisted mode)
   */
  updatePrompt(newPromptText: string): void {
    this.props.generatedPrompt = PromptText.create(newPromptText);
    this.props.status = 'validated'; // User edit = auto-validated
    this.props.updatedAt = new Date();
  }

  /**
   * Check if prompt is ready for image generation
   */
  isReadyForImageGeneration(): boolean {
    return this.props.status === 'validated' &&
           this.props.generatedPrompt.getValue().length > 0;
  }

  /**
   * Get prompt data for DALL-E
   */
  getPromptForDallE(): string {
    if (!this.isReadyForImageGeneration()) {
      throw new Error('Prompt is not ready for image generation');
    }

    return this.props.generatedPrompt.getValue();
  }

  /**
   * Get prompt summary for UI display
   */
  getSummary(): {
    id: string;
    articleId: string;
    promptText: string;
    status: string;
    wordCount: number;
    characterCount: number;
    createdAt: Date;
  } {
    const promptText = this.props.generatedPrompt.getValue();

    return {
      id: this.id.getValue(),
      articleId: this.articleId,
      promptText,
      status: this.status,
      wordCount: promptText.split(' ').length,
      characterCount: promptText.length,
      createdAt: this.createdAt,
    };
  }
}