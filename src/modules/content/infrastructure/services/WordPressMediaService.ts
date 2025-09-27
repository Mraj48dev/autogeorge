import { Result } from '../../shared/domain/types/Result';

export interface WordPressMediaUpload {
  file: File;
  title?: string;
  alt_text?: string;
  caption?: string;
}

export interface WordPressMediaResult {
  id: number;
  url: string;
  title: string;
  alt_text: string;
  media_type: string;
  mime_type: string;
}

export interface WordPressMediaError {
  message: string;
  details?: any;
}

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  password: string;
}

/**
 * Service for uploading media to WordPress via REST API
 */
export class WordPressMediaService {

  /**
   * Uploads a file to WordPress media library
   */
  async uploadMedia(
    config: WordPressConfig,
    upload: WordPressMediaUpload
  ): Promise<Result<WordPressMediaResult, WordPressMediaError>> {
    try {
      // Prepare form data for WordPress API
      const formData = new FormData();
      formData.append('file', upload.file);

      if (upload.title) {
        formData.append('title', upload.title);
      }

      if (upload.alt_text) {
        formData.append('alt_text', upload.alt_text);
      }

      if (upload.caption) {
        formData.append('caption', upload.caption);
      }

      // Make request to WordPress REST API
      const wpApiUrl = `${config.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Result.failure({
          message: `WordPress media upload failed: ${response.status} ${response.statusText}`,
          details: errorData
        });
      }

      const mediaData = await response.json();

      const result: WordPressMediaResult = {
        id: mediaData.id,
        url: mediaData.source_url,
        title: mediaData.title?.rendered || upload.title || 'Uploaded Image',
        alt_text: mediaData.alt_text || upload.alt_text || '',
        media_type: mediaData.media_type || 'image',
        mime_type: mediaData.mime_type || upload.file.type
      };

      return Result.success(result);

    } catch (error) {
      console.error('WordPress media upload error:', error);
      return Result.failure({
        message: 'Failed to upload media to WordPress',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Gets media by ID from WordPress
   */
  async getMedia(
    config: WordPressConfig,
    mediaId: number
  ): Promise<Result<WordPressMediaResult, WordPressMediaError>> {
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

      const result: WordPressMediaResult = {
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
    config: WordPressConfig,
    mediaId: number,
    force: boolean = false
  ): Promise<Result<void, WordPressMediaError>> {
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