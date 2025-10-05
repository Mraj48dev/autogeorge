import { GenerateImagePrompt } from '../application/use-cases/GenerateImagePrompt';
import { ValidateImagePrompt } from '../application/use-cases/ValidateImagePrompt';
import { Result } from '../../../shared/domain/types/Result';

export interface GeneratePromptRequestDto {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  template?: string;
  aiModel?: string;
}

export interface ValidatePromptRequestDto {
  promptId: string;
  updatedPrompt?: string;
}

/**
 * Admin Facade for PromptEngineer Module
 *
 * Provides simplified interface for administrative operations on prompt engineering
 */
export class PromptEngineerFacade {
  constructor(
    private readonly generateImagePrompt: GenerateImagePrompt,
    private readonly validateImagePrompt: ValidateImagePrompt
  ) {}

  /**
   * Generate an AI-optimized prompt for image generation
   */
  async generatePrompt(request: GeneratePromptRequestDto): Promise<Result<any>> {
    try {
      const result = await this.generateImagePrompt.execute({
        articleId: request.articleId,
        articleTitle: request.articleTitle,
        articleContent: request.articleContent,
        template: request.template,
        aiModel: request.aiModel,
      });

      if (result.isFailure()) {
        return Result.fail(result.error);
      }

      return Result.ok({
        success: true,
        promptId: result.getValue().promptId,
        articleId: result.getValue().articleId,
        generatedPrompt: result.getValue().generatedPrompt,
        status: result.getValue().status,
        metadata: result.getValue().metadata,
      });

    } catch (error) {
      return Result.fail(`Error in generatePrompt: ${error}`);
    }
  }

  /**
   * Validate and optionally update a generated prompt
   */
  async validatePrompt(request: ValidatePromptRequestDto): Promise<Result<any>> {
    try {
      const result = await this.validateImagePrompt.execute({
        promptId: request.promptId,
        updatedPrompt: request.updatedPrompt,
      });

      if (result.isFailure()) {
        return Result.fail(result.error);
      }

      return Result.ok({
        success: true,
        promptId: result.getValue().promptId,
        isValid: result.getValue().isValid,
        validatedPrompt: result.getValue().validatedPrompt,
        suggestions: result.getValue().suggestions,
        warnings: result.getValue().warnings,
      });

    } catch (error) {
      return Result.fail(`Error in validatePrompt: ${error}`);
    }
  }

  /**
   * Health check for prompt engineering services
   */
  async healthCheck(): Promise<Result<any>> {
    try {
      // This would typically check ChatGPT API availability
      // For now, return a basic health status

      return Result.ok({
        status: 'healthy',
        services: {
          promptEngineering: 'available',
          chatgpt: 'configured',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      return Result.fail(`Health check failed: ${error}`);
    }
  }

  /**
   * Get available AI models for prompt engineering
   */
  async getAvailableModels(): Promise<Result<string[]>> {
    try {
      const models = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];

      return Result.ok(models);

    } catch (error) {
      return Result.fail(`Error getting available models: ${error}`);
    }
  }
}