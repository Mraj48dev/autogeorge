import { IImagePromptRepository } from '../application/ports/IImagePromptRepository';
import { ImagePrompt } from '../domain/entities/ImagePrompt';
import { PromptId } from '../domain/value-objects/PromptId';
import { PromptText } from '../domain/value-objects/PromptText';
import { prisma } from '../../../shared/database/prisma';

/**
 * Prisma implementation of ImagePrompt repository
 */
export class PrismaImagePromptRepository implements IImagePromptRepository {
  async save(imagePrompt: ImagePrompt): Promise<void> {
    const data = {
      id: imagePrompt.id.getValue(),
      articleId: imagePrompt.articleId,
      articleTitle: imagePrompt.articleTitle,
      articleExcerpt: imagePrompt.articleExcerpt,
      generatedPrompt: imagePrompt.generatedPrompt.getValue(),
      originalTemplate: imagePrompt.originalTemplate,
      aiModel: imagePrompt.aiModel,
      status: imagePrompt.status,
      metadata: imagePrompt.metadata ? JSON.stringify(imagePrompt.metadata) : null,
      errorMessage: imagePrompt.errorMessage,
      createdAt: imagePrompt.createdAt,
      updatedAt: imagePrompt.updatedAt,
    };

    await prisma.imagePrompt.upsert({
      where: { id: imagePrompt.id.getValue() },
      create: data,
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async findById(promptId: string): Promise<ImagePrompt | null> {
    const record = await prisma.imagePrompt.findUnique({
      where: { id: promptId },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  async findByArticleId(articleId: string): Promise<ImagePrompt[]> {
    const records = await prisma.imagePrompt.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(record => this.toDomainEntity(record));
  }

  async findLatestByArticleId(articleId: string): Promise<ImagePrompt | null> {
    const record = await prisma.imagePrompt.findFirst({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return null;
    }

    return this.toDomainEntity(record);
  }

  async delete(promptId: string): Promise<void> {
    await prisma.imagePrompt.delete({
      where: { id: promptId },
    });
  }

  async findByStatus(status: string): Promise<ImagePrompt[]> {
    const records = await prisma.imagePrompt.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(record => this.toDomainEntity(record));
  }

  /**
   * Convert database record to domain entity
   */
  private toDomainEntity(record: any): ImagePrompt {
    const metadata = record.metadata ? JSON.parse(record.metadata) : undefined;

    return new ImagePrompt({
      id: PromptId.create(record.id),
      articleId: record.articleId,
      articleTitle: record.articleTitle,
      articleExcerpt: record.articleExcerpt,
      generatedPrompt: PromptText.create(record.generatedPrompt || ''),
      originalTemplate: record.originalTemplate,
      aiModel: record.aiModel,
      status: record.status,
      metadata,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}