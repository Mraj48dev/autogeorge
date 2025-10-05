import { ValueObject } from '../../../../shared/domain/base/ValueObject';

export class PromptText extends ValueObject<string> {
  private static readonly MAX_LENGTH = 4000; // DALL-E limit
  private static readonly MIN_LENGTH = 10;

  constructor(value: string) {
    super(value);
    this.validate();
  }

  static create(value: string): PromptText {
    return new PromptText(value);
  }

  protected validate(): void {
    if (this.value && this.value.length > 0) {
      if (this.value.length > PromptText.MAX_LENGTH) {
        throw new Error(`Prompt text cannot exceed ${PromptText.MAX_LENGTH} characters`);
      }

      if (this.value.length < PromptText.MIN_LENGTH) {
        throw new Error(`Prompt text must be at least ${PromptText.MIN_LENGTH} characters`);
      }

      // Check for potential DALL-E problematic content
      const problematicPatterns = [
        /\bDIVIETO\b/i,
        /\bNON CREARE MAI\b/i,
        /\bASSOLUTO\b/i,
        /\bOBBLIGATORIO\b/i,
        /\bVIETATO\b/i,
      ];

      for (const pattern of problematicPatterns) {
        if (pattern.test(this.value)) {
          throw new Error('Prompt contains potentially problematic directive language');
        }
      }
    }
  }

  /**
   * Get character count
   */
  getCharacterCount(): number {
    return this.value.length;
  }

  /**
   * Get word count
   */
  getWordCount(): number {
    return this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if prompt is suitable for DALL-E
   */
  isDallECompatible(): boolean {
    try {
      this.validate();
      return this.value.length >= PromptText.MIN_LENGTH &&
             this.value.length <= PromptText.MAX_LENGTH;
    } catch {
      return false;
    }
  }

  /**
   * Get prompt statistics
   */
  getStats(): {
    characterCount: number;
    wordCount: number;
    isValid: boolean;
    isDallECompatible: boolean;
  } {
    return {
      characterCount: this.getCharacterCount(),
      wordCount: this.getWordCount(),
      isValid: this.value.length > 0,
      isDallECompatible: this.isDallECompatible(),
    };
  }

  /**
   * Truncate prompt to DALL-E limits if needed
   */
  truncateForDallE(): PromptText {
    if (this.value.length <= PromptText.MAX_LENGTH) {
      return this;
    }

    // Truncate at word boundary
    const truncated = this.value.substring(0, PromptText.MAX_LENGTH);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    const finalText = lastSpaceIndex > 0
      ? truncated.substring(0, lastSpaceIndex)
      : truncated;

    return new PromptText(finalText);
  }
}