import { AggregateRoot } from '../../shared/domain/base/Entity';
import { ArticleId } from '../value-objects/ArticleId';
import { Content } from '../value-objects/Content';
import { Title } from '../value-objects/Title';
import { ArticleGenerated } from '../events/ArticleGenerated';
import { ArticleUpdated } from '../events/ArticleUpdated';
import { ArticleStatus } from '../value-objects/ArticleStatus';
import { SeoMetadata } from './SeoMetadata';

/**
 * Article Aggregate Root representing a generated content piece.
 *
 * The Article is the central entity in the content generation process,
 * managing its lifecycle from generation through publication.
 *
 * Business Rules:
 * - Articles must have a title and content
 * - Status transitions must follow valid workflows
 * - SEO metadata is optional but recommended
 * - Generated articles must track their source and generation parameters
 * - Articles can be regenerated while preserving identity
 *
 * Aggregate Invariants:
 * - Article must always have valid title and content when not in draft
 * - Status transitions must be valid (draft -> generated -> published)
 * - SEO metadata, if present, must be complete and valid
 */
export class Article extends AggregateRoot<ArticleId> {
  private _title: Title;
  private _content: Content;
  private _status: ArticleStatus;
  private _seoMetadata?: SeoMetadata;
  private _sourceId?: string; // ID of the source that triggered generation
  private _generationParams?: GenerationParameters;
  private _publishedAt?: Date;

  constructor(
    id: ArticleId,
    title: Title,
    content: Content,
    status: ArticleStatus = ArticleStatus.draft(),
    seoMetadata?: SeoMetadata,
    sourceId?: string,
    generationParams?: GenerationParameters,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._title = title;
    this._content = content;
    this._status = status;
    this._seoMetadata = seoMetadata;
    this._sourceId = sourceId;
    this._generationParams = generationParams;

    this.validateInvariants();
  }

  /**
   * Creates a new draft article
   */
  static createDraft(
    title: Title,
    content: Content,
    sourceId?: string,
    generationParams?: GenerationParameters
  ): Article {
    const id = ArticleId.generate();
    const article = new Article(
      id,
      title,
      content,
      ArticleStatus.draft(),
      undefined,
      sourceId,
      generationParams
    );

    return article;
  }

  /**
   * Creates a new generated article and publishes ArticleGenerated event
   */
  static createGenerated(
    title: Title,
    content: Content,
    sourceId: string,
    generationParams: GenerationParameters,
    seoMetadata?: SeoMetadata
  ): Article {
    const id = ArticleId.generate();
    const article = new Article(
      id,
      title,
      content,
      ArticleStatus.generated(),
      seoMetadata,
      sourceId,
      generationParams
    );

    article.addDomainEvent(
      new ArticleGenerated(
        id.getValue(),
        title.getValue(),
        content.getStats(),
        sourceId,
        generationParams
      )
    );

    return article;
  }

  // Getters
  get title(): Title {
    return this._title;
  }

  get content(): Content {
    return this._content;
  }

  get status(): ArticleStatus {
    return this._status;
  }

  get seoMetadata(): SeoMetadata | undefined {
    return this._seoMetadata;
  }

  get sourceId(): string | undefined {
    return this._sourceId;
  }

  get generationParams(): GenerationParameters | undefined {
    return this._generationParams;
  }

  get publishedAt(): Date | undefined {
    return this._publishedAt ? new Date(this._publishedAt) : undefined;
  }

  /**
   * Updates the article title and content
   */
  updateContent(title: Title, content: Content): void {
    this._title = title;
    this._content = content;
    this.markAsUpdated();

    this.addDomainEvent(
      new ArticleUpdated(
        this.id.getValue(),
        'content',
        { title: title.getValue(), contentStats: content.getStats() }
      )
    );

    this.validateInvariants();
  }

  /**
   * Adds or updates SEO metadata
   */
  updateSeoMetadata(seoMetadata: SeoMetadata): void {
    this._seoMetadata = seoMetadata;
    this.markAsUpdated();

    this.addDomainEvent(
      new ArticleUpdated(
        this.id.getValue(),
        'seo',
        { seoMetadata: seoMetadata.toJSON() }
      )
    );
  }

  /**
   * Marks the article as ready for publication
   */
  markAsReadyToPublish(): void {
    if (!this.canTransitionTo(ArticleStatus.readyToPublish())) {
      throw new Error(
        `Cannot transition from ${this._status.getValue()} to ready_to_publish`
      );
    }

    this._status = ArticleStatus.readyToPublish();
    this.markAsUpdated();

    this.addDomainEvent(
      new ArticleUpdated(
        this.id.getValue(),
        'status',
        { status: this._status.getValue() }
      )
    );
  }

  /**
   * Marks the article as published
   */
  markAsPublished(): void {
    if (!this.canTransitionTo(ArticleStatus.published())) {
      throw new Error(
        `Cannot transition from ${this._status.getValue()} to published`
      );
    }

    this._status = ArticleStatus.published();
    this._publishedAt = new Date();
    this.markAsUpdated();

    this.addDomainEvent(
      new ArticleUpdated(
        this.id.getValue(),
        'status',
        {
          status: this._status.getValue(),
          publishedAt: this._publishedAt
        }
      )
    );
  }

  /**
   * Marks the article as failed
   */
  markAsFailed(reason: string): void {
    this._status = ArticleStatus.failed();
    this.markAsUpdated();

    this.addDomainEvent(
      new ArticleUpdated(
        this.id.getValue(),
        'status',
        {
          status: this._status.getValue(),
          failureReason: reason
        }
      )
    );
  }

  /**
   * Checks if the article can transition to the given status
   */
  canTransitionTo(newStatus: ArticleStatus): boolean {
    const currentStatus = this._status.getValue();
    const targetStatus = newStatus.getValue();

    const validTransitions: Record<string, string[]> = {
      'draft': ['generated', 'failed'],
      'generated': ['ready_to_publish', 'failed'],
      'ready_to_publish': ['published', 'failed'],
      'published': [], // Terminal state
      'failed': ['draft', 'generated'], // Can retry
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * Checks if the article is ready for publication
   */
  isReadyForPublication(): boolean {
    return this._status.equals(ArticleStatus.readyToPublish()) ||
           this._status.equals(ArticleStatus.generated());
  }

  /**
   * Checks if the article has been published
   */
  isPublished(): boolean {
    return this._status.equals(ArticleStatus.published());
  }

  /**
   * Returns article summary for listings
   */
  getSummary(): ArticleSummary {
    return {
      id: this.id.getValue(),
      title: this._title.getValue(),
      excerpt: this._content.getExcerpt(),
      status: this._status.getValue(),
      wordCount: this._content.getWordCount(),
      estimatedReadingTime: this._content.getEstimatedReadingTime(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this._publishedAt,
    };
  }

  /**
   * Validates aggregate invariants
   */
  protected validateInvariants(): void {
    // Articles in non-draft status must have complete content
    if (!this._status.equals(ArticleStatus.draft())) {
      if (this._content.getWordCount() < 50) {
        throw new Error('Generated articles must have substantial content');
      }
    }

    // Published articles must have SEO metadata
    if (this._status.equals(ArticleStatus.published()) && !this._seoMetadata) {
      throw new Error('Published articles must have SEO metadata');
    }

    // Published articles must have a published date
    if (this._status.equals(ArticleStatus.published()) && !this._publishedAt) {
      throw new Error('Published articles must have a published date');
    }
  }

  /**
   * Returns the complete article data for JSON serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      title: this._title.getValue(),
      content: this._content.getValue(),
      status: this._status.getValue(),
      seoMetadata: this._seoMetadata?.toJSON(),
      sourceId: this._sourceId,
      generationParams: this._generationParams,
      publishedAt: this._publishedAt,
      stats: this._content.getStats(),
    };
  }
}

/**
 * Parameters used for article generation
 */
export interface GenerationParameters {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  tone?: string;
  style?: string;
  targetAudience?: string;
}

/**
 * Article summary for list views
 */
export interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  wordCount: number;
  estimatedReadingTime: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}