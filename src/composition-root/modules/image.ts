import { ImageAdminFacade } from '../../modules/image/admin/ImageAdminFacade';
import { GenerateImage } from '../../modules/image/application/use-cases/GenerateImage';
import { UploadImageToWordPress } from '../../modules/image/application/use-cases/UploadImageToWordPress';
import { PrismaImageRepository } from '../../modules/image/infrastructure/repositories/PrismaImageRepository';
import { DalleImageGenerationService } from '../../modules/image/infrastructure/services/DalleImageGenerationService';
import { WordPressMediaService } from '../../modules/publishing/infrastructure/services/WordPressMediaService';

/**
 * Image Module Container
 *
 * Configures and provides all dependencies for the Image module
 */
export function createImageContainer() {
  // Infrastructure layer
  const imageRepository = new PrismaImageRepository();
  const imageGenerationService = new DalleImageGenerationService();
  const wordPressMediaService = new WordPressMediaService();

  // Application layer
  const generateImage = new GenerateImage(
    imageRepository,
    imageGenerationService
  );

  const uploadImageToWordPress = new UploadImageToWordPress(
    imageRepository,
    wordPressMediaService
  );

  // Admin layer
  const imageAdminFacade = new ImageAdminFacade(
    generateImage,
    uploadImageToWordPress
  );

  return {
    // Repositories
    imageRepository,

    // Services
    imageGenerationService,
    wordPressMediaService,

    // Use Cases
    generateImage,
    uploadImageToWordPress,

    // Admin
    imageAdminFacade,
  };
}

export type ImageContainer = ReturnType<typeof createImageContainer>;