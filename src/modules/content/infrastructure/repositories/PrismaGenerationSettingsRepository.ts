import { PrismaClient } from '@prisma/client';
import { GenerationSettings, GenerationSettingsId } from '../../domain/entities/GenerationSettings';
import { GenerationSettingsRepository } from '../../domain/ports/GenerationSettingsRepository';
import { Result } from '../../shared/domain/types/Result';

/**
 * Prisma implementation of GenerationSettingsRepository
 */
export class PrismaGenerationSettingsRepository implements GenerationSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(settings: GenerationSettings): Promise<Result<void>> {
    try {
      await this.prisma.generationSettings.create({
        data: {
          id: settings.id.getValue(),
          userId: settings.userId,
          titlePrompt: settings.titlePrompt,
          contentPrompt: settings.contentPrompt,
          seoPrompt: settings.seoPrompt,
          defaultModel: settings.defaultModel,
          defaultTemperature: settings.defaultTemperature,
          defaultMaxTokens: settings.defaultMaxTokens,
          defaultLanguage: settings.defaultLanguage,
          defaultTone: settings.defaultTone,
          defaultStyle: settings.defaultStyle,
          defaultTargetAudience: settings.defaultTargetAudience,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      });

      return Result.success(void 0);
    } catch (error) {
      return Result.failure(`Failed to save generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string): Promise<Result<GenerationSettings | null>> {
    try {
      const record = await this.prisma.generationSettings.findUnique({
        where: { userId },
      });

      if (!record) {
        return Result.success(null);
      }

      const settings = this.toDomainEntity(record);
      return Result.success(settings);
    } catch (error) {
      return Result.failure(`Failed to find generation settings by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: GenerationSettingsId): Promise<Result<GenerationSettings | null>> {
    try {
      const record = await this.prisma.generationSettings.findUnique({
        where: { id: id.getValue() },
      });

      if (!record) {
        return Result.success(null);
      }

      const settings = this.toDomainEntity(record);
      return Result.success(settings);
    } catch (error) {
      return Result.failure(`Failed to find generation settings by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(settings: GenerationSettings): Promise<Result<void>> {
    try {
      await this.prisma.generationSettings.update({
        where: { id: settings.id.getValue() },
        data: {
          titlePrompt: settings.titlePrompt,
          contentPrompt: settings.contentPrompt,
          seoPrompt: settings.seoPrompt,
          defaultModel: settings.defaultModel,
          defaultTemperature: settings.defaultTemperature,
          defaultMaxTokens: settings.defaultMaxTokens,
          defaultLanguage: settings.defaultLanguage,
          defaultTone: settings.defaultTone,
          defaultStyle: settings.defaultStyle,
          defaultTargetAudience: settings.defaultTargetAudience,
          updatedAt: settings.updatedAt,
        },
      });

      return Result.success(void 0);
    } catch (error) {
      return Result.failure(`Failed to update generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: GenerationSettingsId): Promise<Result<void>> {
    try {
      await this.prisma.generationSettings.delete({
        where: { id: id.getValue() },
      });

      return Result.success(void 0);
    } catch (error) {
      return Result.failure(`Failed to delete generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async existsByUserId(userId: string): Promise<Result<boolean>> {
    try {
      const count = await this.prisma.generationSettings.count({
        where: { userId },
      });

      return Result.success(count > 0);
    } catch (error) {
      return Result.failure(`Failed to check generation settings existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private toDomainEntity(record: any): GenerationSettings {
    const id = GenerationSettingsId.create(record.id);
    if (!id.isSuccess()) {
      throw new Error(`Invalid generation settings ID: ${id.error}`);
    }

    return new GenerationSettings(
      id.value,
      record.userId,
      record.titlePrompt,
      record.contentPrompt,
      record.seoPrompt,
      record.defaultModel,
      record.defaultTemperature,
      record.defaultMaxTokens,
      record.defaultLanguage,
      record.defaultTone,
      record.defaultStyle,
      record.defaultTargetAudience,
      record.createdAt,
      record.updatedAt
    );
  }
}