import { ImagePrompt } from '../../domain/entities/ImagePrompt';

/**
 * Repository interface for ImagePrompt persistence
 */
export interface IImagePromptRepository {
  /**
   * Save an image prompt
   */
  save(imagePrompt: ImagePrompt): Promise<void>;

  /**
   * Find an image prompt by ID
   */
  findById(promptId: string): Promise<ImagePrompt | null>;

  /**
   * Find image prompts by article ID
   */
  findByArticleId(articleId: string): Promise<ImagePrompt[]>;

  /**
   * Find the latest prompt for an article
   */
  findLatestByArticleId(articleId: string): Promise<ImagePrompt | null>;

  /**
   * Delete an image prompt
   */
  delete(promptId: string): Promise<void>;

  /**
   * Find prompts by status
   */
  findByStatus(status: string): Promise<ImagePrompt[]>;
}