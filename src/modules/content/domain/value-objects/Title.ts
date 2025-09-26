import { StringValueObject } from '../../shared/domain/base/ValueObject';
import { Result } from '../../shared/domain/types/Result';

/**
 * Value Object representing an article title.
 *
 * Business Rules:
 * - Title cannot be empty or just whitespace
 * - Must be between 10 and 200 characters for SEO optimization
 * - Should not contain excessive special characters
 * - Cannot contain HTML tags or malicious content
 * - Should be optimized for readability and SEO
 *
 * This ensures all article titles meet quality and safety standards.
 */
export class Title extends StringValueObject {
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 200;

  // Pattern to detect HTML tags
  private static readonly HTML_TAG_PATTERN = /<[^>]+>/g;

  // Pattern for excessive special characters (more than 20% of title)
  private static readonly SPECIAL_CHAR_PATTERN = /[^a-zA-Z0-9\s\-.,!?:;'"()]/g;

  protected validate(value: string): void {
    this.validateNotEmpty();
    this.validateLength();
    this.validateContent();
  }

  private validateLength(): void {
    const trimmedValue = this.value.trim();

    if (trimmedValue.length < Title.MIN_LENGTH) {
      throw new Error(
        `Title must be at least ${Title.MIN_LENGTH} characters long`
      );
    }

    if (trimmedValue.length > Title.MAX_LENGTH) {
      throw new Error(
        `Title cannot exceed ${Title.MAX_LENGTH} characters`
      );
    }
  }

  private validateContent(): void {
    // Check for HTML tags
    if (Title.HTML_TAG_PATTERN.test(this.value)) {
      throw new Error('Title cannot contain HTML tags');
    }

    // Check for excessive special characters
    const specialChars = this.value.match(Title.SPECIAL_CHAR_PATTERN) || [];
    const specialCharPercentage = specialChars.length / this.value.length;

    if (specialCharPercentage > 0.2) {
      throw new Error('Title contains too many special characters');
    }

    // Check for common problematic patterns
    if (this.value.includes('  ')) {
      throw new Error('Title cannot contain multiple consecutive spaces');
    }

    if (/^\s|\s$/.test(this.value)) {
      throw new Error('Title cannot start or end with whitespace');
    }
  }

  /**
   * Returns the title optimized for URLs (slug format)
   */
  toSlug(): string {
    return this.value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
  }

  /**
   * Returns the title optimized for SEO (proper case, good length)
   */
  toSeoOptimized(): string {
    let title = this.value.trim();

    // Ensure it's not too long for SEO (Google typically shows ~60 chars)
    if (title.length > 60) {
      // Try to cut at a word boundary
      const truncated = title.substring(0, 57);
      const lastSpaceIndex = truncated.lastIndexOf(' ');

      if (lastSpaceIndex > 40) {
        title = truncated.substring(0, lastSpaceIndex) + '...';
      } else {
        title = truncated + '...';
      }
    }

    return title;
  }

  /**
   * Returns title with proper capitalization
   */
  toTitleCase(): string {
    return this.value
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Don't capitalize articles, prepositions, and conjunctions unless they're the first word
        const lowercaseWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in'];

        if (lowercaseWords.includes(word) && word !== this.value.split(' ')[0].toLowerCase()) {
          return word;
        }

        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Estimates the title's SEO quality score (0-100)
   */
  getSeoScore(): number {
    let score = 100;
    const length = this.value.length;

    // Length optimization (50-60 chars is ideal)
    if (length < 30) {
      score -= 20; // Too short
    } else if (length > 70) {
      score -= 15; // Too long
    } else if (length >= 50 && length <= 60) {
      score += 10; // Perfect length
    }

    // Word count (4-12 words is ideal)
    const wordCount = this.getWordCount();
    if (wordCount < 3) {
      score -= 15; // Too few words
    } else if (wordCount > 15) {
      score -= 10; // Too many words
    } else if (wordCount >= 6 && wordCount <= 10) {
      score += 5; // Good word count
    }

    // Check for power words and emotional triggers
    const powerWords = ['ultimate', 'complete', 'guide', 'essential', 'proven', 'secret', 'amazing', 'incredible'];
    const hasPowerWord = powerWords.some(word =>
      this.value.toLowerCase().includes(word)
    );
    if (hasPowerWord) {
      score += 5;
    }

    // Check for numbers (numbers in titles often perform well)
    if (/\d+/.test(this.value)) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Returns the number of words in the title
   */
  getWordCount(): number {
    return this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Checks if the title is optimized for search engines
   */
  isSeoOptimized(): boolean {
    return this.getSeoScore() >= 80;
  }

  /**
   * Returns title analysis for optimization suggestions
   */
  getAnalysis(): TitleAnalysis {
    return {
      length: this.value.length,
      wordCount: this.getWordCount(),
      seoScore: this.getSeoScore(),
      slug: this.toSlug(),
      isSeoOptimized: this.isSeoOptimized(),
      suggestions: this.getSuggestions(),
    };
  }

  private getSuggestions(): string[] {
    const suggestions: string[] = [];
    const length = this.value.length;
    const wordCount = this.getWordCount();

    if (length < 30) {
      suggestions.push('Consider making the title longer for better SEO');
    } else if (length > 70) {
      suggestions.push('Consider shortening the title for better readability');
    }

    if (wordCount < 4) {
      suggestions.push('Add more descriptive words to improve clarity');
    } else if (wordCount > 12) {
      suggestions.push('Consider reducing the number of words for better impact');
    }

    if (!/\d+/.test(this.value)) {
      suggestions.push('Consider adding a number to make the title more engaging');
    }

    if (!this.value.includes('?') && !this.value.includes(':')) {
      suggestions.push('Consider using a question or colon to improve readability');
    }

    return suggestions;
  }

  static getMinLength(): number {
    return Title.MIN_LENGTH;
  }

  static getMaxLength(): number {
    return Title.MAX_LENGTH;
  }

  /**
   * Creates a new Title instance safely, returning a Result
   */
  static create(value: string): Result<Title, string> {
    try {
      const title = new Title(value);
      return Result.success(title);
    } catch (error) {
      return Result.failure(error instanceof Error ? error.message : 'Invalid title');
    }
  }
}

export interface TitleAnalysis {
  length: number;
  wordCount: number;
  seoScore: number;
  slug: string;
  isSeoOptimized: boolean;
  suggestions: string[];
}