import { ImageAdminFacade } from '../../modules/image/admin/ImageAdminFacade';
import { GenerateImage } from '../../modules/image/application/use-cases/GenerateImage';
import { PrismaImageRepository } from '../../modules/image/infrastructure/repositories/PrismaImageRepository';
import { DalleImageGenerationService } from '../../modules/image/infrastructure/services/DalleImageGenerationService';

/**
 * Image Module Container
 *
 * Configures and provides all dependencies for the Image module
 */
export function createImageContainer() {
  // Infrastructure layer
  const imageRepository = new PrismaImageRepository();
  const imageGenerationService = new DalleImageGenerationService();

  // Application layer
  const generateImage = new GenerateImage(
    imageRepository,
    imageGenerationService
  );

  // Admin layer
  const imageAdminFacade = new ImageAdminFacade(
    generateImage
  );

  return {
    // Repositories
    imageRepository,

    // Services
    imageGenerationService,

    // Use Cases
    generateImage,

    // Admin
    imageAdminFacade,
  };
}

export type ImageContainer = ReturnType<typeof createImageContainer>;