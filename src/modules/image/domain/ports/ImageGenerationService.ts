import { Result } from '../../../../shared/domain/types/Result';

export interface ImageGenerationRequest {
  articleId: string;
  title: string;
  content?: string;
  aiPrompt?: string;
  style?: 'natural' | 'vivid';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

export interface GeneratedImageResponse {
  url: string;
  revisedPrompt?: string;
  width: number;
  height: number;
  format: string;
}

export interface ImageGenerationError {
  code: 'API_ERROR' | 'QUOTA_EXCEEDED' | 'INVALID_PROMPT' | 'NETWORK_ERROR' | 'CONFIG_ERROR';
  message: string;
  details?: any;
}

/**
 * Port for AI Image Generation Service (DALL-E)
 *
 * Handles generation of featured images using AI based on article content
 */
export interface ImageGenerationService {
  /**
   * Generate an image using AI based on article content
   */
  generateImage(
    request: ImageGenerationRequest
  ): Promise<Result<GeneratedImageResponse, ImageGenerationError>>;

  /**
   * Test the image generation service connection
   */
  testConnection(): Promise<Result<{ available: boolean; model: string }, ImageGenerationError>>;

  /**
   * Build an optimized prompt for image generation
   */
  buildPrompt(title: string, content?: string, customPrompt?: string): string;
}