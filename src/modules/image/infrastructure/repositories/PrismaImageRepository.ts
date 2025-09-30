import { Result } from '../../../../shared/domain/types/Result';
import { prisma } from '../../../../shared/database/prisma';
import { ImageRepository } from '../../domain/ports/ImageRepository';
import { FeaturedImage } from '../../domain/entities/FeaturedImage';
import { ImageId } from '../../domain/value-objects/ImageId';
import { ImageUrl } from '../../domain/value-objects/ImageUrl';
import { ImageFilename } from '../../domain/value-objects/ImageFilename';
import { ImageAltText } from '../../domain/value-objects/ImageAltText';
import { ImageStatus } from '../../domain/value-objects/ImageStatus';

/**
 * Prisma implementation of ImageRepository
 */
export class PrismaImageRepository implements ImageRepository {
  async save(image: FeaturedImage): Promise<Result<FeaturedImage, Error>> {
    try {
      const data = {
        id: image.id.value,
        articleId: image.articleId,
        aiPrompt: image.aiPrompt,
        filename: image.filename.value,
        altText: image.altText.value,
        url: image.url?.value,
        status: image.status.value,
        searchQuery: image.searchQuery,
        errorMessage: image.errorMessage,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
      };

      const savedImage = await prisma.featuredImage.create({
        data
      });

      return Result.success(this.mapToDomain(savedImage));

    } catch (error) {
      return Result.failure(
        new Error(`Failed to save featured image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async findById(id: ImageId): Promise<Result<FeaturedImage | null, Error>> {
    try {
      const image = await prisma.featuredImage.findUnique({
        where: { id: id.value }
      });

      if (!image) {
        return Result.success(null);
      }

      return Result.success(this.mapToDomain(image));

    } catch (error) {
      return Result.failure(
        new Error(`Failed to find featured image by ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async findByArticleId(articleId: string): Promise<Result<FeaturedImage | null, Error>> {
    try {
      const image = await prisma.featuredImage.findFirst({
        where: { articleId }
      });

      if (!image) {
        return Result.success(null);
      }

      return Result.success(this.mapToDomain(image));

    } catch (error) {
      return Result.failure(
        new Error(`Failed to find featured image by article ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async findByStatus(status: string): Promise<Result<FeaturedImage[], Error>> {
    try {
      const images = await prisma.featuredImage.findMany({
        where: { status }
      });

      const domainImages = images.map(image => this.mapToDomain(image));
      return Result.success(domainImages);

    } catch (error) {
      return Result.failure(
        new Error(`Failed to find featured images by status: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async update(image: FeaturedImage): Promise<Result<FeaturedImage, Error>> {
    try {
      const data = {
        aiPrompt: image.aiPrompt,
        filename: image.filename.value,
        altText: image.altText.value,
        url: image.url?.value,
        status: image.status.value,
        searchQuery: image.searchQuery,
        errorMessage: image.errorMessage,
        updatedAt: image.updatedAt,
      };

      const updatedImage = await prisma.featuredImage.update({
        where: { id: image.id.value },
        data
      });

      return Result.success(this.mapToDomain(updatedImage));

    } catch (error) {
      return Result.failure(
        new Error(`Failed to update featured image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async delete(id: ImageId): Promise<Result<void, Error>> {
    try {
      await prisma.featuredImage.delete({
        where: { id: id.value }
      });

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(
        new Error(`Failed to delete featured image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  async existsForArticle(articleId: string): Promise<Result<boolean, Error>> {
    try {
      const count = await prisma.featuredImage.count({
        where: { articleId }
      });

      return Result.success(count > 0);

    } catch (error) {
      return Result.failure(
        new Error(`Failed to check if featured image exists: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  private mapToDomain(prismaImage: any): FeaturedImage {
    return new FeaturedImage({
      id: ImageId.fromString(prismaImage.id),
      articleId: prismaImage.articleId,
      aiPrompt: prismaImage.aiPrompt,
      filename: ImageFilename.create(prismaImage.filename),
      altText: ImageAltText.create(prismaImage.altText),
      url: prismaImage.url ? ImageUrl.create(prismaImage.url) : undefined,
      status: ImageStatus.create(prismaImage.status),
      searchQuery: prismaImage.searchQuery,
      errorMessage: prismaImage.errorMessage,
      createdAt: prismaImage.createdAt,
      updatedAt: prismaImage.updatedAt,
    });
  }
}