import { Result } from '../../../../shared/domain/types/Result';

export interface MediaUpload {
  file: File;
  title?: string;
  alt_text?: string;
  caption?: string;
}

export interface MediaResult {
  id: number;
  url: string;
  title: string;
  alt_text: string;
  media_type: string;
  mime_type: string;
}

export interface MediaError {
  message: string;
  details?: any;
}

export interface PlatformConfig {
  siteUrl: string;
  username: string;
  password: string;
}

/**
 * Port for media management services
 * Abstracts the platform-specific media operations
 */
export interface MediaService {
  /**
   * Uploads a file to the media library of the target platform
   */
  uploadMedia(
    config: PlatformConfig,
    upload: MediaUpload
  ): Promise<Result<MediaResult, MediaError>>;

  /**
   * Retrieves media by ID from the target platform
   */
  getMedia(
    config: PlatformConfig,
    mediaId: number
  ): Promise<Result<MediaResult, MediaError>>;

  /**
   * Deletes media from the target platform
   */
  deleteMedia(
    config: PlatformConfig,
    mediaId: number,
    force?: boolean
  ): Promise<Result<void, MediaError>>;
}