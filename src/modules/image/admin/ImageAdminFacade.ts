import { Result } from '../../../shared/domain/types/Result';
import { GenerateImage, GenerateImageInput, GenerateImageOutput } from '../application/use-cases/GenerateImage';

/**
 * Admin Facade for Image Module
 *
 * Provides administrative interface for image generation operations
 */
export class ImageAdminFacade {
  constructor(
    private readonly generateImageUseCase: GenerateImage
  ) {}

  /**
   * List available use cases for this module
   */
  listUseCases(): string[] {
    return [
      'GenerateImage'
    ];
  }

  /**
   * Execute a use case
   */
  async execute(
    useCase: string,
    input: any,
    options: { dryRun?: boolean; idempotencyKey?: string } = {}
  ): Promise<Result<any, Error>> {
    this.logOperation('execute', { useCase, input, options });

    // Handle dry run
    if (options.dryRun) {
      return this.handleDryRun(useCase, input);
    }

    try {
      switch (useCase) {
        case 'GenerateImage':
          return await this.generateImageUseCase.execute(input as GenerateImageInput);

        default:
          return Result.failure(new Error(`Unknown use case: ${useCase}`));
      }
    } catch (error) {
      const message = `Failed to execute ${useCase}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logError('execute', message, { useCase, input, error });
      return Result.failure(new Error(message));
    }
  }

  /**
   * Validate input for a use case
   */
  async validate(useCase: string, input: any): Promise<Result<boolean, Error>> {
    try {
      switch (useCase) {
        case 'GenerateImage':
          return this.validateGenerateImageInput(input);

        default:
          return Result.failure(new Error(`Unknown use case: ${useCase}`));
      }
    } catch (error) {
      return Result.failure(new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get module health status
   */
  async getModuleHealth(): Promise<Result<any, Error>> {
    try {
      // Basic health checks
      const health = {
        module: 'image',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          useCasesAvailable: this.listUseCases().length > 0,
          dependenciesResolved: true
        }
      };

      return Result.success(health);
    } catch (error) {
      return Result.failure(new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  private async handleDryRun(useCase: string, input: any): Promise<Result<any, Error>> {
    // Validate input without executing
    const validationResult = await this.validate(useCase, input);
    if (validationResult.isFailure()) {
      return Result.failure(validationResult.error);
    }

    return Result.success({
      dryRun: true,
      useCase,
      input,
      message: `Dry run successful for ${useCase}`,
      timestamp: new Date().toISOString()
    });
  }

  private validateGenerateImageInput(input: any): Result<boolean, Error> {
    const required = ['articleId', 'title', 'filename', 'altText'];

    for (const field of required) {
      if (!input[field] || typeof input[field] !== 'string' || input[field].trim().length === 0) {
        return Result.failure(new Error(`Field '${field}' is required and must be a non-empty string`));
      }
    }

    // Validate optional fields
    if (input.style && !['natural', 'vivid'].includes(input.style)) {
      return Result.failure(new Error('Style must be either "natural" or "vivid"'));
    }

    if (input.size && !['1024x1024', '1792x1024', '1024x1792'].includes(input.size)) {
      return Result.failure(new Error('Size must be one of: 1024x1024, 1792x1024, 1024x1792'));
    }

    return Result.success(true);
  }

  private logOperation(operation: string, data: any): void {
    console.log(`[ImageAdminFacade] ${operation}:`, JSON.stringify(data, null, 2));
  }

  private logError(operation: string, message: string, context: any): void {
    console.error(`[ImageAdminFacade] ${operation} ERROR: ${message}`, context);
  }
}