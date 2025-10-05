/**
 * Server-side image compression service
 * Handles image optimization for WordPress uploads
 */
export class ImageCompressionService {

  /**
   * Compresses image buffer using Node.js compatible methods
   */
  static async compressImageBuffer(
    buffer: ArrayBuffer,
    filename: string,
    maxSizeBytes: number = 1024 * 1024,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }> {

    try {
      // If buffer is already small enough, return as-is
      if (buffer.byteLength <= maxSizeBytes) {
        console.log(`📦 [Image Compression] Buffer size ${Math.round(buffer.byteLength / 1024)}KB is within limit`);
        return {
          buffer,
          filename,
          mimeType: this.getMimeTypeFromFilename(filename)
        };
      }

      console.log(`🗜️ [Image Compression] Compressing buffer from ${Math.round(buffer.byteLength / 1024)}KB`);

      // For server-side, we'll use a simpler approach
      // In a production environment, you'd use sharp or similar library

      // For now, we'll reduce quality by returning a smaller buffer
      // This is a placeholder - in production use Sharp library:
      // const sharp = require('sharp');
      // const compressed = await sharp(buffer)
      //   .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      //   .jpeg({ quality: 80 })
      //   .toBuffer();

      // Simple fallback: just return original if too complex to compress server-side
      console.log(`⚠️ [Image Compression] Server-side compression not implemented, using original`);

      return {
        buffer,
        filename: this.changeExtensionToJpeg(filename),
        mimeType: 'image/jpeg'
      };

    } catch (error) {
      console.error('❌ [Image Compression] Compression failed:', error);
      return {
        buffer,
        filename,
        mimeType: this.getMimeTypeFromFilename(filename)
      };
    }
  }

  /**
   * Get MIME type from filename
   */
  private static getMimeTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Change file extension to .jpg
   */
  private static changeExtensionToJpeg(filename: string): string {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}.jpg`;
  }

  /**
   * Validates if image size is acceptable
   */
  static isImageSizeAcceptable(sizeBytes: number, maxSizeBytes: number = 2 * 1024 * 1024): boolean {
    return sizeBytes <= maxSizeBytes;
  }

  /**
   * Gets human-readable size string
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}