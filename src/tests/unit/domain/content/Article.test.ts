import { describe, test, expect, beforeEach } from 'vitest';
import { Article, GenerationParameters } from '../../../../modules/content/domain/entities/Article';
import { ArticleId } from '../../../../modules/content/domain/value-objects/ArticleId';
import { Title } from '../../../../modules/content/domain/value-objects/Title';
import { Content } from '../../../../modules/content/domain/value-objects/Content';
import { ArticleStatus } from '../../../../modules/content/domain/value-objects/ArticleStatus';

/**
 * Unit tests for the Article domain entity.
 *
 * These tests verify the business rules and invariants of the Article aggregate root.
 * They focus on domain logic without dependencies on infrastructure.
 */
describe('Article Domain Entity', () => {
  let articleId: ArticleId;
  let title: Title;
  let content: Content;
  let generationParams: GenerationParameters;

  beforeEach(() => {
    articleId = ArticleId.generate();
    title = new Title('Test Article Title About Technology');
    content = new Content('This is a test article content with sufficient length to meet the minimum requirements for a valid article. '.repeat(3));
    generationParams = {
      prompt: 'Write about technology',
      model: 'test-model',
      temperature: 0.7,
    };
  });

  describe('Article Creation', () => {
    test('should create a draft article successfully', () => {
      const article = Article.createDraft(title, content, 'source-123', generationParams);

      expect(article.id).toBeDefined();
      expect(article.title.getValue()).toBe(title.getValue());
      expect(article.content.getValue()).toBe(content.getValue());
      expect(article.status.isDraft()).toBe(true);
      expect(article.sourceId).toBe('source-123');
      expect(article.generationParams).toEqual(generationParams);
      expect(article.publishedAt).toBeUndefined();
    });

    test('should create a generated article successfully', () => {
      const article = Article.createGenerated(title, content, 'source-123', generationParams);

      expect(article.id).toBeDefined();
      expect(article.title.getValue()).toBe(title.getValue());
      expect(article.content.getValue()).toBe(content.getValue());
      expect(article.status.isGenerated()).toBe(true);
      expect(article.sourceId).toBe('source-123');
      expect(article.generationParams).toEqual(generationParams);
      expect(article.domainEvents).toHaveLength(1);
      expect(article.domainEvents[0].eventType).toBe('ArticleGenerated');
    });

    test('should set creation and update timestamps', () => {
      const beforeCreation = new Date();
      const article = Article.createDraft(title, content);
      const afterCreation = new Date();

      expect(article.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(article.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(article.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(article.updatedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('Content Updates', () => {
    test('should update content successfully', () => {
      const article = Article.createDraft(title, content);
      const newTitle = new Title('Updated Article Title About Science');
      const newContent = new Content('This is updated content with sufficient length to meet requirements. '.repeat(3));

      article.updateContent(newTitle, newContent);

      expect(article.title.getValue()).toBe(newTitle.getValue());
      expect(article.content.getValue()).toBe(newContent.getValue());
      expect(article.domainEvents).toHaveLength(1);
      expect(article.domainEvents[0].eventType).toBe('ArticleUpdated');
    });

    test('should update timestamps when content is updated', () => {
      const article = Article.createDraft(title, content);
      const originalUpdatedAt = article.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        const newTitle = new Title('Updated Title About Technology Innovation');
        const newContent = new Content('Updated content with sufficient length. '.repeat(5));

        article.updateContent(newTitle, newContent);

        expect(article.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('Status Transitions', () => {
    test('should transition from draft to generated', () => {
      const article = new Article(articleId, title, content, ArticleStatus.draft());

      expect(article.canTransitionTo(ArticleStatus.generated())).toBe(true);
    });

    test('should transition from generated to ready_to_publish', () => {
      const article = new Article(articleId, title, content, ArticleStatus.generated());

      article.markAsReadyToPublish();

      expect(article.status.isReadyToPublish()).toBe(true);
      expect(article.domainEvents).toHaveLength(1);
      expect(article.domainEvents[0].eventType).toBe('ArticleUpdated');
    });

    test('should transition from ready_to_publish to published', () => {
      const article = new Article(articleId, title, content, ArticleStatus.readyToPublish());

      article.markAsPublished();

      expect(article.status.isPublished()).toBe(true);
      expect(article.publishedAt).toBeDefined();
      expect(article.publishedAt!.getTime()).toBeLessThanOrEqual(new Date().getTime());
      expect(article.domainEvents).toHaveLength(1);
    });

    test('should reject invalid status transitions', () => {
      const article = new Article(articleId, title, content, ArticleStatus.published());

      expect(() => article.markAsReadyToPublish()).toThrow(
        'Cannot transition from published to ready_to_publish'
      );
    });

    test('should allow transition to failed from any status', () => {
      const article = new Article(articleId, title, content, ArticleStatus.generated());

      article.markAsFailed('Test failure reason');

      expect(article.status.isFailed()).toBe(true);
      expect(article.domainEvents).toHaveLength(1);
    });
  });

  describe('Business Rules Validation', () => {
    test('should reject articles with insufficient content for non-draft status', () => {
      const shortContent = new Content('Short content. '.repeat(10)); // Still meets min length but not substantial

      expect(() => {
        new Article(articleId, title, shortContent, ArticleStatus.generated());
      }).toThrow('Generated articles must have substantial content');
    });

    test('should require SEO metadata for published articles', () => {
      expect(() => {
        new Article(
          articleId,
          title,
          content,
          ArticleStatus.published(),
          undefined, // No SEO metadata
          'source-123',
          generationParams
        );
      }).toThrow('Published articles must have SEO metadata');
    });

    test('should require published date for published articles', () => {
      const article = new Article(articleId, title, content, ArticleStatus.readyToPublish());

      // Manually set status to published without going through markAsPublished
      article['_status'] = ArticleStatus.published();

      expect(() => {
        article.checkInvariants();
      }).toThrow('Published articles must have a published date');
    });
  });

  describe('Article Queries', () => {
    test('should check if article is ready for publication', () => {
      const draftArticle = new Article(articleId, title, content, ArticleStatus.draft());
      const generatedArticle = new Article(articleId, title, content, ArticleStatus.generated());
      const readyArticle = new Article(articleId, title, content, ArticleStatus.readyToPublish());
      const publishedArticle = new Article(articleId, title, content, ArticleStatus.published());

      expect(draftArticle.isReadyForPublication()).toBe(false);
      expect(generatedArticle.isReadyForPublication()).toBe(true);
      expect(readyArticle.isReadyForPublication()).toBe(true);
      expect(publishedArticle.isReadyForPublication()).toBe(false);
    });

    test('should check if article is published', () => {
      const draftArticle = new Article(articleId, title, content, ArticleStatus.draft());
      const publishedArticle = new Article(articleId, title, content, ArticleStatus.published());

      expect(draftArticle.isPublished()).toBe(false);
      expect(publishedArticle.isPublished()).toBe(true);
    });

    test('should return article summary', () => {
      const article = Article.createGenerated(title, content, 'source-123', generationParams);
      const summary = article.getSummary();

      expect(summary.id).toBe(article.id.getValue());
      expect(summary.title).toBe(title.getValue());
      expect(summary.status).toBe('generated');
      expect(summary.wordCount).toBeGreaterThan(0);
      expect(summary.estimatedReadingTime).toBeGreaterThan(0);
      expect(summary.createdAt).toBeDefined();
      expect(summary.updatedAt).toBeDefined();
    });
  });

  describe('Domain Events', () => {
    test('should publish ArticleGenerated event when created as generated', () => {
      const article = Article.createGenerated(title, content, 'source-123', generationParams);

      expect(article.domainEvents).toHaveLength(1);
      expect(article.domainEvents[0].eventType).toBe('ArticleGenerated');
      expect(article.domainEvents[0].aggregateId).toBe(article.id.getValue());
      expect(article.domainEvents[0].aggregateType).toBe('Article');
    });

    test('should publish ArticleUpdated event when content changes', () => {
      const article = Article.createDraft(title, content);
      const newTitle = new Title('Updated Title for Technology Innovation');
      const newContent = new Content('Updated content with sufficient length for testing. '.repeat(4));

      article.updateContent(newTitle, newContent);

      expect(article.domainEvents).toHaveLength(1);
      expect(article.domainEvents[0].eventType).toBe('ArticleUpdated');
    });

    test('should clear domain events', () => {
      const article = Article.createGenerated(title, content, 'source-123', generationParams);

      expect(article.domainEvents).toHaveLength(1);

      article.clearDomainEvents();

      expect(article.domainEvents).toHaveLength(0);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const article = Article.createGenerated(title, content, 'source-123', generationParams);
      const json = article.toJSON();

      expect(json.id).toBe(article.id.getValue());
      expect(json.title).toBe(title.getValue());
      expect(json.content).toBe(content.getValue());
      expect(json.status).toBe('generated');
      expect(json.sourceId).toBe('source-123');
      expect(json.generationParams).toEqual(generationParams);
      expect(json.stats).toBeDefined();
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Equality and Identity', () => {
    test('should be equal to another article with the same ID', () => {
      const article1 = new Article(articleId, title, content, ArticleStatus.draft());
      const article2 = new Article(articleId, title, content, ArticleStatus.generated());

      expect(article1.equals(article2)).toBe(true);
    });

    test('should not be equal to articles with different IDs', () => {
      const article1 = new Article(articleId, title, content, ArticleStatus.draft());
      const article2 = new Article(ArticleId.generate(), title, content, ArticleStatus.draft());

      expect(article1.equals(article2)).toBe(false);
    });

    test('should have a string representation', () => {
      const article = new Article(articleId, title, content, ArticleStatus.draft());
      const stringRep = article.toString();

      expect(stringRep).toBe(`Article(${articleId.getValue()})`);
    });
  });
});