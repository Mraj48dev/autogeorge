import { StringValueObject } from '../../../../shared/domain/base/ValueObject';

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
  private static readonly MIN_LENGTH = 100; // Minimum article length in characters
  private static readonly MAX_LENGTH = 50000; // Maximum article length in characters

  // Basic patterns to detect potentially malicious content
  private static readonly SCRIPT_PATTERN = /<script[^>]*>.*?<\/script>/gi;
  private static readonly DANGEROUS_ATTRIBUTES = /on\w+\s*=/gi;

  protected validate(value: string): void {
    this.validateNotEmpty();
    this.validateLength();
    this.validateSafety();
  }

  private validateLength(): void {
    const cleanContent = this.stripHtmlTags(this.value);

    if (cleanContent.length < Content.MIN_LENGTH) {
      throw new Error(
        `Article content must be at least ${Content.MIN_LENGTH} characters long (excluding HTML tags)`
      );
    }

    if (this.value.length > Content.MAX_LENGTH) {
      throw new Error(
        `Article content cannot exceed ${Content.MAX_LENGTH} characters`
      );
    }
  }

  private validateSafety(): void {
    // Check for script tags
    if (Content.SCRIPT_PATTERN.test(this.value)) {
      throw new Error('Article content cannot contain script tags');
    }

    // Check for dangerous event attributes (onclick, onload, etc.)
    if (Content.DANGEROUS_ATTRIBUTES.test(this.value)) {
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
}

export interface ContentStats {
  totalLength: number;
  plainTextLength: number;
  wordCount: number;
  estimatedReadingTime: number;
  isHtml: boolean;
  isMarkdown: boolean;
}