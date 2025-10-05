import { UseCase } from '../../../../shared/application/base/UseCase';
import { Result } from '../../../../shared/domain/types/Result';
import { IImagePromptRepository } from '../ports/IImagePromptRepository';

export interface ValidateImagePromptRequest {
  promptId: string;
  updatedPrompt?: string; // For user editing in ai_assisted mode
}

export interface ValidateImagePromptResponse {
  promptId: string;
  isValid: boolean;
  validatedPrompt: string;
  suggestions?: string[];
  warnings?: string[];
}

/**
 * Validate Image Prompt Use Case
 *
 * Validates and optionally updates an AI-generated prompt for DALL-E compatibility.
 * Used in ai_assisted mode when user wants to edit the generated prompt.
 */
export class ValidateImagePrompt extends UseCase<ValidateImagePromptRequest, ValidateImagePromptResponse> {
  constructor(
    private readonly imagePromptRepository: IImagePromptRepository
  ) {
    super();
  }

  protected async executeImpl(request: ValidateImagePromptRequest): Promise<Result<ValidateImagePromptResponse>> {
    try {
      // Find the image prompt
      const imagePrompt = await this.imagePromptRepository.findById(request.promptId);
      if (!imagePrompt) {
        return Result.fail('Image prompt not found');
      }

      // Update prompt if provided (user editing)
      if (request.updatedPrompt) {
        try {
          imagePrompt.updatePrompt(request.updatedPrompt);
        } catch (error) {
          return Result.fail(`Invalid prompt: ${error}`);
        }
      }

      // Validate current prompt
      if (!imagePrompt.isReadyForImageGeneration()) {
        return Result.fail('Prompt is not ready for image generation');
      }

      // Analyze prompt for potential issues
      const analysis = this.analyzePrompt(imagePrompt.getPromptForDallE());

      // Save updated prompt
      await this.imagePromptRepository.save(imagePrompt);

      return Result.ok({
        promptId: imagePrompt.id.getValue(),
        isValid: true,
        validatedPrompt: imagePrompt.getPromptForDallE(),
        suggestions: analysis.suggestions,
        warnings: analysis.warnings,
      });

    } catch (error) {
      return Result.fail(`Unexpected error in ValidateImagePrompt: ${error}`);
    }
  }

  /**
   * Analyze prompt for potential improvements and warnings
   */
  private analyzePrompt(prompt: string): {
    suggestions: string[];
    warnings: string[];
  } {
    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Check length
    if (prompt.length < 50) {
      suggestions.push('Consider adding more descriptive details');
    }

    if (prompt.length > 1000) {
      warnings.push('Prompt might be too long for optimal DALL-E results');
    }

    // Check for problematic patterns
    const problematicPatterns = [
      { pattern: /\b(non|not|no|never|don't)\b/gi, message: 'Avoid negative instructions' },
      { pattern: /\b(must|should|required|mandatory)\b/gi, message: 'Use descriptive language instead of requirements' },
      { pattern: /\b(forbidden|prohibited|banned)\b/gi, message: 'Avoid restrictive language' },
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(prompt)) {
        warnings.push(message);
      }
    }

    // Positive suggestions
    if (!prompt.toLowerCase().includes('professional')) {
      suggestions.push('Consider adding "professional" for business context');
    }

    if (!prompt.toLowerCase().includes('lighting')) {
      suggestions.push('Specify lighting style (natural, soft, etc.)');
    }

    if (!prompt.toLowerCase().includes('style')) {
      suggestions.push('Add photography or art style specification');
    }

    return { suggestions, warnings };
  }
}