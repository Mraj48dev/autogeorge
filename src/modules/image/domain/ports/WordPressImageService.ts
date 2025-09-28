import { Result } from '../../../shared/domain/types/Result';

export interface WordPressImageUploadRequest {
  imageUrl: string;
  filename: string;
  altText: string;
  title?: string;
  caption?: string;
  description?: string;
}

export interface WordPressImageUploadResponse {
  mediaId: number;
  url: string;
  filename: string;
  altText: string;
  title: string;
  caption: string;
  description: string;
  mediaType: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  uploadedAt: Date;
}

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  password: string;
}

export interface WordPressImageError {
  code: 'UPLOAD_FAILED' | 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FORMAT';
  message: string;
  details?: any;
}

/**
 * Port for WordPress Image Upload Service
 *
 * Handles uploading images to WordPress media library
 */
export interface WordPressImageService {
  /**
   * Upload an image to WordPress media library
   */
  uploadImage(
    request: WordPressImageUploadRequest,
    credentials: WordPressCredentials
  ): Promise<Result<WordPressImageUploadResponse, WordPressImageError>>;

  /**
   * Test WordPress connection
   */
  testConnection(credentials: WordPressCredentials): Promise<Result<{ connected: boolean; version: string }, WordPressImageError>>;

  /**
   * Get WordPress media library info
   */
  getMediaLibraryInfo(credentials: WordPressCredentials): Promise<Result<{ totalItems: number; usedSpace: number; maxUploadSize: number }, WordPressImageError>>;
}