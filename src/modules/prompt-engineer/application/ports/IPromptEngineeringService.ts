import { Result } from '../../../../shared/domain/types/Result';

export interface PromptGenerationRequest {
  title: string;
  content: string;
  template: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface PromptGenerationResult {
  promptText: string;
  metadata?: {
    tokensUsed?: number;
    model: string;
    processingTime?: number;
    confidence?: number;
    [key: string]: any;
  };
}

/**
 * Port for AI-based prompt engineering services
 */
export interface IPromptEngineeringService {
  /**
   * Generate an optimized prompt for DALL-E based on article content
   */
  generateImagePrompt(request: PromptGenerationRequest): Promise<Result<PromptGenerationResult>>;

  /**
   * Validate if the service is available and configured correctly
   */
  healthCheck(): Promise<Result<boolean>>;

  /**
   * Get available AI models for prompt engineering
   */
  getAvailableModels(): string[];
}