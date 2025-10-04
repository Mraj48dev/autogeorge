import { Result } from '../../../../shared/domain/types/Result';
import { FeaturedImage } from '../../domain/entities/FeaturedImage';
import { ImageRepository } from '../../domain/ports/ImageRepository';
import { ImageGenerationService, ImageGenerationRequest } from '../../domain/ports/ImageGenerationService';

export interface GenerateImageInput {
  articleId: string;
  title: string;
  content?: string;
  aiPrompt?: string;
  filename: string;
  altText: string;
  style?: 'natural' | 'vivid';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

export interface GenerateImageOutput {
  imageId: string;
  url: string;
  filename: string;
  altText: string;
  status: string;
  revisedPrompt?: string;
}

/**
 * Use Case for generating featured images using AI
 *
 * This use case orchestrates the image generation process:
 * 1. Creates a FeaturedImage entity in pending state
 * 2. Calls the AI image generation service
 * 3. Updates the entity with the result
 * 4. Persists the final state
 */
export class GenerateImage {
  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly imageGenerationService: ImageGenerationService
  ) {}

  async execute(input: GenerateImageInput): Promise<Result<GenerateImageOutput, Error>> {
    try {
      // Step 1: Create featured image entity in pending state
      const featuredImage = FeaturedImage.create(
        input.articleId,
        input.aiPrompt || '',
        input.filename,
        input.altText
      );

      // Step 2: Save initial state
      const saveResult = await this.imageRepository.save(featuredImage);
      if (saveResult.isFailure()) {
        return Result.failure(new Error(`Failed to save image entity: ${saveResult.error.message}`));
      }

      // Step 3: Mark as searching (only for logging - immediate AI generation)
      featuredImage.markAsSearching('Direct AI Generation - Auto-Approved');

      // Step 4: Execute DIRECT AI image generation (no search, no approval needed)
      const generationRequest: ImageGenerationRequest = {
        articleId: input.articleId,
        title: input.title,
        content: input.content,
        aiPrompt: input.aiPrompt,
        style: input.style || 'natural',
        size: input.size || '1792x1024'
      };

      const generationResult = await this.imageGenerationService.generateImage(generationRequest);

      if (generationResult.isFailure()) {
        // Mark as failed
        featuredImage.markAsFailed(`Image generation failed: ${generationResult.error.message}`);
        await this.imageRepository.update(featuredImage);

        return Result.failure(new Error(`Image generation failed: ${generationResult.error.message}`));
      }

      // Step 5: Mark as found and AUTO-APPROVE (no manual intervention needed)
      const generatedImage = generationResult.value;
      featuredImage.markAsFound(generatedImage.url);

      console.log('✅ [GenerateImage] DALL-E image generated and AUTO-APPROVED');
      console.log('ℹ️ [GenerateImage] Generated URL (24h expiry):', generatedImage.url.substring(0, 80) + '...');
      console.log('🎉 [GenerateImage] Image automatically approved - no manual review required');

      // Step 6: Save final state (image ready for article linking)
      const updateResult = await this.imageRepository.update(featuredImage);
      if (updateResult.isFailure()) {
        return Result.failure(new Error(`Failed to update image entity: ${updateResult.error.message}`));
      }

      console.log('✅ [GenerateImage] Image entity saved and ready for article linking');
      console.log('📋 [GenerateImage] Next step: Article status will be updated automatically by cron');

      // Step 7: Return success result
      return Result.success({
        imageId: featuredImage.id.getValue(),
        url: generatedImage.url,
        filename: featuredImage.filename.getValue(),
        altText: featuredImage.altText.getValue(),
        status: featuredImage.status.getValue(),
        revisedPrompt: generatedImage.revisedPrompt
      });

    } catch (error) {
      return Result.failure(
        error instanceof Error
          ? error
          : new Error('Unknown error occurred during image generation')
      );
    }
  }
}