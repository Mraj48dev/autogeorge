import { Result } from '../../../../shared/domain/types/Result';
import { FeaturedImage } from '../../domain/entities/FeaturedImage';
import { ImageRepository } from '../../domain/ports/ImageRepository';
import { ImageId } from '../../domain/value-objects/ImageId';
import { WordPressMediaService } from '../../../publishing/infrastructure/services/WordPressMediaService';
import { PlatformConfig } from '../../../publishing/domain/ports/MediaService';

export interface UploadImageToWordPressInput {
  imageId: string;
  wordPressConfig: {
    siteUrl: string;
    username: string;
    password: string;
  };
}

export interface UploadImageToWordPressOutput {
  imageId: string;
  originalUrl: string;
  wordPressUrl: string;
  wordPressMediaId: number;
  success: boolean;
}

/**
 * Use Case for uploading generated images to WordPress
 *
 * This solves the DALL-E URL expiration problem by:
 * 1. Downloading the temporary DALL-E image
 * 2. Uploading it to WordPress media library
 * 3. Updating the database with permanent WordPress URL
 */
export class UploadImageToWordPress {
  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly wordPressMediaService: WordPressMediaService
  ) {}

  async execute(input: UploadImageToWordPressInput): Promise<Result<UploadImageToWordPressOutput, Error>> {
    try {
      // Step 1: Get the featured image from database
      const imageId = ImageId.fromString(input.imageId);
      const imageResult = await this.imageRepository.findById(imageId);
      if (imageResult.isFailure()) {
        return Result.failure(new Error(`Image not found: ${imageResult.error.message}`));
      }

      const featuredImage = imageResult.value;
      if (!featuredImage) {
        return Result.failure(new Error('Featured image not found'));
      }

      // Check if already uploaded to WordPress
      if (featuredImage.status.getValue() === 'uploaded') {
        return Result.failure(new Error('Image already uploaded to WordPress'));
      }

      // Step 2: Download the DALL-E image with timeout
      const imageUrl = featuredImage.url?.getValue();
      if (!imageUrl) {
        return Result.failure(new Error('No image URL available'));
      }

      console.log('📥 [WordPress Upload] Downloading DALL-E image:', imageUrl);

      // Download with timeout
      const downloadController = new AbortController();
      const downloadTimeout = setTimeout(() => downloadController.abort(), 30000); // 30 seconds

      let imageResponse;
      try {
        imageResponse = await fetch(imageUrl, {
          signal: downloadController.signal,
          headers: {
            'User-Agent': 'AutoGeorge/1.0 (Image Downloader)'
          }
        });
        clearTimeout(downloadTimeout);
      } catch (error) {
        clearTimeout(downloadTimeout);
        if (error instanceof Error && error.name === 'AbortError') {
          return Result.failure(new Error('Image download timed out after 30 seconds'));
        }
        throw error;
      }

      if (!imageResponse.ok) {
        return Result.failure(new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`));
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const imageSizeKB = Math.round(imageBuffer.byteLength / 1024);
      console.log(`📊 [WordPress Upload] Downloaded image size: ${imageSizeKB}KB`);

      // Create File object for WordPress upload
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      const imageFile = new File([imageBlob], featuredImage.filename.getValue(), { type: 'image/png' });

      console.log(`📋 [WordPress Upload] Prepared file: ${imageFile.name} (${Math.round(imageFile.size / 1024)}KB)`);

      // Step 3: Upload to WordPress media library with enhanced logging
      console.log('📤 [WordPress Upload] Starting WordPress media library upload');
      console.log(`🎯 [WordPress Upload] Target: ${input.wordPressConfig.siteUrl}`);
      console.log(`📏 [WordPress Upload] File size: ${Math.round(imageFile.size / 1024)}KB`);

      const platformConfig: PlatformConfig = {
        siteUrl: input.wordPressConfig.siteUrl,
        username: input.wordPressConfig.username,
        password: input.wordPressConfig.password
      };

      const uploadStartTime = Date.now();
      const uploadResult = await this.wordPressMediaService.uploadMedia(platformConfig, {
        file: imageFile,
        title: featuredImage.altText.getValue(),
        alt_text: featuredImage.altText.getValue(),
        caption: featuredImage.altText.getValue()
      });
      const uploadDuration = Date.now() - uploadStartTime;

      if (uploadResult.isFailure()) {
        console.error(`❌ [WordPress Upload] Upload failed after ${uploadDuration}ms:`, uploadResult.error);
        return Result.failure(new Error(`WordPress upload failed: ${uploadResult.error.message}`));
      }

      const mediaResult = uploadResult.value;
      console.log(`✅ [WordPress Upload] Upload successful in ${uploadDuration}ms:`, {
        mediaId: mediaResult.id,
        url: mediaResult.url,
        title: mediaResult.title
      });

      // Step 4: Update FeaturedImage with WordPress URL
      featuredImage.markAsFound(mediaResult.url);
      featuredImage.markAsUploaded(mediaResult.id, mediaResult.url);

      const updateResult = await this.imageRepository.update(featuredImage);
      if (updateResult.isFailure()) {
        console.error('⚠️ [WordPress Upload] Failed to update image in database:', updateResult.error);
        // Continue anyway since WordPress upload succeeded
      }

      return Result.success({
        imageId: input.imageId,
        originalUrl: imageUrl,
        wordPressUrl: mediaResult.url,
        wordPressMediaId: mediaResult.id,
        success: true
      });

    } catch (error) {
      console.error('❌ [WordPress Upload] Upload failed:', error);
      return Result.failure(new Error(`Upload to WordPress failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}