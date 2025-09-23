import { GenerationSettings, GenerationSettingsId } from '../entities/GenerationSettings';
import { Result } from '../../shared/domain/types/Result';

/**
 * Repository interface for Generation Settings persistence
 */
export interface GenerationSettingsRepository {
  /**
   * Saves generation settings to the repository
   */
  save(settings: GenerationSettings): Promise<Result<void>>;

  /**
   * Finds generation settings by user ID
   */
  findByUserId(userId: string): Promise<Result<GenerationSettings | null>>;

  /**
   * Finds generation settings by ID
   */
  findById(id: GenerationSettingsId): Promise<Result<GenerationSettings | null>>;

  /**
   * Updates existing generation settings
   */
  update(settings: GenerationSettings): Promise<Result<void>>;

  /**
   * Deletes generation settings by ID
   */
  delete(id: GenerationSettingsId): Promise<Result<void>>;

  /**
   * Checks if generation settings exist for a user
   */
  existsByUserId(userId: string): Promise<Result<boolean>>;
}