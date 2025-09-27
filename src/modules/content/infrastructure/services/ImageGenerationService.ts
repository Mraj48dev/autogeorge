import { Result } from '../../../shared/domain/types/Result';

export interface ImageGenerationRequest {
  title: string;
  content?: string;
  style?: 'photo' | 'illustration' | 'abstract';
  size?: 'small' | 'medium' | 'large';
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  alt_text: string;
  source: 'unsplash' | 'dalle' | 'local';
  metadata?: {
    author?: string;
    license?: string;
    source_url?: string;
  };
}

export interface ImageGenerationError {
  message: string;
  details?: string;
}

/**
 * Service for generating featured images for articles
 * Initially uses Unsplash API for relevant stock photos
 * Can be extended to use DALL-E or other AI image generation services
 */
export class ImageGenerationService {
  private readonly unsplashAccessKey: string | undefined;

  constructor() {
    this.unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  /**
   * Generates a featured image based on article title and content
   */
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<Result<GeneratedImage, ImageGenerationError>> {
    try {
      // For now, use Unsplash to find relevant images
      if (this.unsplashAccessKey) {
        return await this.generateFromUnsplash(request);
      }

      // Fallback to a placeholder service
      return await this.generatePlaceholder(request);

    } catch (error) {
      console.error('Image generation error:', error);
      return Result.failure({
        message: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generates image using Unsplash API
   */
  private async generateFromUnsplash(
    request: ImageGenerationRequest
  ): Promise<Result<GeneratedImage, ImageGenerationError>> {
    try {
      // Extract keywords from title for search
      const keywords = this.extractKeywords(request.title);
      const query = keywords.join(' ');

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.unsplashAccessKey}`
          }
        }
      );

      if (!response.ok) {
        return Result.failure({
          message: 'Failed to fetch from Unsplash',
          details: `HTTP ${response.status}: ${response.statusText}`
        });
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        // Fallback to placeholder if no results
        return await this.generatePlaceholder(request);
      }

      // Select the first result
      const photo = data.results[0];

      const image: GeneratedImage = {
        url: photo.urls.regular,
        width: photo.width,
        height: photo.height,
        alt_text: photo.alt_description || request.title,
        source: 'unsplash',
        metadata: {
          author: photo.user.name,
          license: 'Unsplash License',
          source_url: photo.links.html
        }
      };

      return Result.success(image);

    } catch (error) {
      console.error('Unsplash generation error:', error);
      return Result.failure({
        message: 'Unsplash API error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generates a placeholder image
   */
  private async generatePlaceholder(
    request: ImageGenerationRequest
  ): Promise<Result<GeneratedImage, ImageGenerationError>> {
    // Use a placeholder service like picsum.photos
    const width = request.size === 'large' ? 1200 : request.size === 'medium' ? 800 : 600;
    const height = Math.floor(width * 0.6); // 16:10 aspect ratio

    const image: GeneratedImage = {
      url: `https://picsum.photos/${width}/${height}?random=${Date.now()}`,
      width,
      height,
      alt_text: request.title,
      source: 'local'
    };

    return Result.success(image);
  }

  /**
   * Extracts relevant keywords from title for image search
   */
  private extractKeywords(title: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = ['il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'dei', 'delle', 'del', 'della', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'a', 'e', 'o', 'ma', 'che', 'se', 'come', 'quando', 'dove', 'perché'];

    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3); // Take first 3 keywords
  }

  /**
   * Downloads an image from URL and returns it as a File object
   */
  async downloadImage(imageUrl: string, filename?: string): Promise<Result<File, ImageGenerationError>> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        return Result.failure({
          message: 'Failed to download image',
          details: `HTTP ${response.status}: ${response.statusText}`
        });
      }

      const blob = await response.blob();
      const file = new File([blob], filename || 'featured-image.jpg', {
        type: blob.type || 'image/jpeg'
      });

      return Result.success(file);

    } catch (error) {
      return Result.failure({
        message: 'Image download error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}