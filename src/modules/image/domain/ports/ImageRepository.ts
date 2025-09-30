import { Result } from '../../../../shared/domain/types/Result';
import { FeaturedImage } from '../entities/FeaturedImage';
import { ImageId } from '../value-objects/ImageId';

/**
 * Repository interface for FeaturedImage persistence
 */
export interface ImageRepository {
  /**
   * Save a featured image
   */
  save(image: FeaturedImage): Promise<Result<FeaturedImage, Error>>;

  /**
   * Find a featured image by ID
   */
  findById(id: ImageId): Promise<Result<FeaturedImage | null, Error>>;

  /**
   * Find a featured image by article ID
   */
  findByArticleId(articleId: string): Promise<Result<FeaturedImage | null, Error>>;

  /**
   * Find all featured images by status
   */
  findByStatus(status: string): Promise<Result<FeaturedImage[], Error>>;

  /**
   * Update a featured image
   */
  update(image: FeaturedImage): Promise<Result<FeaturedImage, Error>>;

  /**
   * Delete a featured image
   */
  delete(id: ImageId): Promise<Result<void, Error>>;

  /**
   * Check if a featured image exists for an article
   */
  existsForArticle(articleId: string): Promise<Result<boolean, Error>>;
}