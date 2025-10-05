import { Result } from '../../../../shared/domain/types/Result';
import {
  MediaService,
  MediaUpload,
  MediaResult,
  MediaError,
  PlatformConfig
} from '../../domain/ports/MediaService';

// Legacy exports for backward compatibility
export interface WordPressMediaUpload extends MediaUpload {}
export interface WordPressMediaResult extends MediaResult {}
export interface WordPressMediaError extends MediaError {}
export interface WordPressConfig extends PlatformConfig {}

/**
 * WordPress implementation of MediaService
 * Handles media upload/management via WordPress REST API
 */
export class WordPressMediaService implements MediaService {

  /**
   * Compresses an image if it's too large
   */
  private async compressImageIfNeeded(file: File, maxSizeBytes: number = 1024 * 1024): Promise<File> {
    // If file is already small enough, return as-is
    if (file.size <= maxSizeBytes) {
      console.log(`📦 [WordPress Upload] File size ${Math.round(file.size / 1024)}KB is within limit`);
      return file;
    }

    console.log(`🗜️ [WordPress Upload] Compressing image from ${Math.round(file.size / 1024)}KB`);

    try {
      // Create canvas for compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      // Convert File to Image
      const imageUrl = URL.createObjectURL(file);

      return new Promise((resolve) => {
        img.onload = () => {
          // Calculate new dimensions (max 1920x1080)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(imageUrl);
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                console.log(`✅ [WordPress Upload] Compressed to ${Math.round(compressedFile.size / 1024)}KB`);
                resolve(compressedFile);
              } else {
                console.log(`⚠️ [WordPress Upload] Compression failed, using original`);
                resolve(file);
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          console.log(`⚠️ [WordPress Upload] Image processing failed, using original`);
          resolve(file);
        };

        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Image compression error:', error);
      return file; // Return original on error
    }
  }

  /**
   * Uploads a file to WordPress media library with retry logic
   */
  async uploadMedia(
    config: PlatformConfig,
    upload: MediaUpload
  ): Promise<Result<MediaResult, MediaError>> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    const maxTimeout = 120000; // 2 minutes

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 [WordPress Upload] Attempt ${attempt}/${maxRetries}`);

        // Compress image if needed
        const processedFile = await this.compressImageIfNeeded(upload.file);

        // Prepare form data for WordPress API
        const formData = new FormData();
        formData.append('file', processedFile);

        if (upload.title) {
          formData.append('title', upload.title);
        }

        if (upload.alt_text) {
          formData.append('alt_text', upload.alt_text);
        }

        if (upload.caption) {
          formData.append('caption', upload.caption);
        }

        // Make request to WordPress REST API with AbortController for timeout
        const wpApiUrl = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), maxTimeout);

        try {
          const response = await fetch(wpApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`
            },
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Check if it's a retryable error
            const isRetryable = (
              response.status === 504 || // Gateway Timeout
              response.status === 502 || // Bad Gateway
              response.status === 503 || // Service Unavailable
              response.status === 500    // Internal Server Error
            );

            if (isRetryable && attempt < maxRetries) {
              console.log(`⏳ [WordPress Upload] Retryable error ${response.status}, waiting before retry...`);
              await this.delay(baseDelay * Math.pow(2, attempt - 1)); // Exponential backoff
              continue;
            }

            return Result.failure({
              message: `WordPress media upload failed: ${response.status} ${response.statusText}`,
              details: errorData
            });
          }

          const mediaData = await response.json();

          const result: MediaResult = {
            id: mediaData.id,
            url: mediaData.source_url,
            title: mediaData.title?.rendered || upload.title || 'Uploaded Image',
            alt_text: mediaData.alt_text || upload.alt_text || '',
            media_type: mediaData.media_type || 'image',
            mime_type: mediaData.mime_type || processedFile.type
          };

          console.log(`✅ [WordPress Upload] Success on attempt ${attempt}`);
          return Result.success(result);

        } catch (fetchError) {
          clearTimeout(timeoutId);

          // Check if it's a timeout or network error (retryable)
          const isNetworkError = (
            fetchError instanceof Error && (
              fetchError.name === 'AbortError' ||
              fetchError.message.includes('fetch') ||
              fetchError.message.includes('network') ||
              fetchError.message.includes('timeout')
            )
          );

          if (isNetworkError && attempt < maxRetries) {
            console.log(`🔄 [WordPress Upload] Network error on attempt ${attempt}, retrying...`);
            await this.delay(baseDelay * Math.pow(2, attempt - 1));
            continue;
          }

          throw fetchError;
        }

      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`❌ [WordPress Upload] Final attempt failed:`, error);
          return Result.failure({
            message: `Failed to upload media to WordPress after ${maxRetries} attempts`,
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        console.log(`⚠️ [WordPress Upload] Attempt ${attempt} failed, retrying...`);
        await this.delay(baseDelay * Math.pow(2, attempt - 1));
      }
    }

    return Result.failure({
      message: `Failed to upload media to WordPress after ${maxRetries} attempts`,
      details: 'All retry attempts exhausted'
    });
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets media by ID from WordPress
   */
  async getMedia(
    config: PlatformConfig,
    mediaId: number
  ): Promise<Result<MediaResult, MediaError>> {
    try {
      const wpApiUrl = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media/${mediaId}`;
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

      const response = await fetch(wpApiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          message: `WordPress media fetch failed: ${response.status} ${response.statusText}`,
          details: errorData
        });
      }

      const mediaData = await response.json();

      const result: MediaResult = {
        id: mediaData.id,
        url: mediaData.source_url,
        title: mediaData.title?.rendered || 'Media',
        alt_text: mediaData.alt_text || '',
        media_type: mediaData.media_type || 'image',
        mime_type: mediaData.mime_type || 'unknown'
      };

      return Result.success(result);

    } catch (error) {
      console.error('WordPress media fetch error:', error);
      return Result.failure({
        message: 'Failed to fetch media from WordPress',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Deletes media from WordPress
   */
  async deleteMedia(
    config: PlatformConfig,
    mediaId: number,
    force: boolean = false
  ): Promise<Result<void, MediaError>> {
    try {
      const wpApiUrl = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media/${mediaId}${force ? '?force=true' : ''}`;
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

      const response = await fetch(wpApiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          message: `WordPress media deletion failed: ${response.status} ${response.statusText}`,
          details: errorData
        });
      }

      return Result.success(undefined);

    } catch (error) {
      console.error('WordPress media deletion error:', error);
      return Result.failure({
        message: 'Failed to delete media from WordPress',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}