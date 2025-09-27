import { StringValueObject } from '../../shared/domain/base/ValueObject';
import { Result } from '../../shared/domain/types/Result';

/**
 * Value Object representing article content.
 *
 * Business Rules:
 * - Content cannot be empty
 * - Must have a minimum length for quality articles
 * - Has a maximum length to prevent extremely long articles
 * - Should be valid HTML or Markdown
 * - Must not contain malicious scripts or code
 *
 * This ensures that all articles meet quality standards and are safe for publication.
 */
export class Content extends StringValueObject {
  private static readonly MIN_LENGTH = 1; // Further relaxed for RSS content
  private static readonly MAX_LENGTH = 50000; // Maximum article length in characters

  // Basic patterns to detect potentially malicious content
  private static readonly SCRIPT_PATTERN = /<script[^>]*>.*?<\/script>/gi;
  private static readonly DANGEROUS_ATTRIBUTES = /on\w+\s*=/gi;

  protected validate(value: string): void {
    this.validateNotEmpty(value);
    this.validateLength(value);
    this.validateSafety(value);
  }

  protected validateNotEmpty(value: string): void {
    // Allow empty content for RSS feeds - will be handled gracefully
    if (value === null || value === undefined) {
      throw new Error('Content cannot be null or undefined');
    }
  }

  private validateLength(value: string): void {
    const cleanContent = this.stripHtmlTags(value);

    // Skip length validation for empty content (RSS feeds might have empty content)
    if (cleanContent.length === 0) {
      return;
    }

    if (cleanContent.length < Content.MIN_LENGTH) {
      throw new Error(
        `Article content must be at least ${Content.MIN_LENGTH} characters long (excluding HTML tags)`
      );
    }

    if (value.length > Content.MAX_LENGTH) {
      throw new Error(
        `Article content cannot exceed ${Content.MAX_LENGTH} characters`
      );
    }
  }

  private validateSafety(value: string): void {
    // Check for script tags
    if (Content.SCRIPT_PATTERN.test(value)) {
      throw new Error('Article content cannot contain script tags');
    }

    // Check for dangerous event attributes (onclick, onload, etc.)
    if (Content.DANGEROUS_ATTRIBUTES.test(value)) {
      throw new Error('Article content cannot contain event handler attributes');
    }
  }

  /**
   * Returns the content with HTML tags stripped for length calculation
   */
  getPlainText(): string {
    return this.stripHtmlTags(this.value);
  }

  /**
   * Returns the word count of the content (excluding HTML)
   */
  getWordCount(): number {
    const plainText = this.getPlainText();
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Returns an excerpt of the content for previews
   */
  getExcerpt(maxLength: number = 200): string {
    const plainText = this.getPlainText();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Find the last complete word within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }

    return truncated + '...';
  }

  /**
   * Estimates reading time in minutes based on average reading speed
   */
  getEstimatedReadingTime(): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.getWordCount();
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Checks if the content appears to be in HTML format
   */
  isHtml(): boolean {
    const htmlPattern = /<[^>]+>/;
    return htmlPattern.test(this.value);
  }

  /**
   * Checks if the content appears to be in Markdown format
   */
  isMarkdown(): boolean {
    const markdownPatterns = [
      /^#{1,6}\s+/m,        // Headers
      /\*\*.*?\*\*/,        // Bold
      /\*.*?\*/,            // Italic
      /\[.*?\]\(.*?\)/,     // Links
      /^[-*+]\s+/m,         // Lists
      /```[\s\S]*?```/,     // Code blocks
    ];

    return markdownPatterns.some(pattern => pattern.test(this.value));
  }

  /**
   * Returns content validation statistics
   */
  getStats(): ContentStats {
    return {
      totalLength: this.value.length,
      plainTextLength: this.getPlainText().length,
      wordCount: this.getWordCount(),
      estimatedReadingTime: this.getEstimatedReadingTime(),
      isHtml: this.isHtml(),
      isMarkdown: this.isMarkdown(),
    };
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  static getMinLength(): number {
    return Content.MIN_LENGTH;
  }

  static getMaxLength(): number {
    return Content.MAX_LENGTH;
  }

  /**
   * Creates a new Content instance safely, returning a Result
   */
  static create(value: string): Result<Content, string> {
    try {
      const content = new Content(value);
      return Result.success(content);
    } catch (error) {
      return Result.failure(error instanceof Error ? error.message : 'Invalid content');
    }
  }
}

export interface ContentStats {
  totalLength: number;
  plainTextLength: number;
  wordCount: number;
  estimatedReadingTime: number;
  isHtml: boolean;
  isMarkdown: boolean;
}