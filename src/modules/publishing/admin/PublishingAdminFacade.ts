import { Result } from '../../../../shared/domain/types/Result';
import { PublishArticle, PublishArticleInput, PublishArticleOutput, PublishArticleError } from '../application/use-cases/PublishArticle';
import { GetPublications, GetPublicationsInput, GetPublicationsOutput, GetPublicationsError } from '../application/use-cases/GetPublications';

/**
 * Admin Facade for the Publishing module.
 *
 * This facade provides a unified interface for administrative operations
 * on the publishing module. It abstracts the complexity of individual use cases
 * and provides a consistent API for CLI tools, HTTP endpoints, and other
 * administrative interfaces.
 *
 * Key responsibilities:
 * - Expose available use cases and their metadata
 * - Validate inputs using JSON schemas
 * - Execute use cases with proper error handling
 * - Support dry-run mode for safe testing
 * - Provide idempotency support
 * - Log all administrative actions for auditing
 */
export class PublishingAdminFacade {
  constructor(
    private readonly publishArticle: PublishArticle,
    private readonly getPublications: GetPublications
  ) {}

  /**
   * Lists all available use cases in this module
   */
  listUseCases(): UseCaseMetadata[] {
    return [
      {
        name: 'PublishArticle',
        description: 'Publishes an article to a specific platform',
        inputSchema: 'publish-article-input.json',
        outputSchema: 'publish-article-output.json',
        category: 'publishing',
        tags: ['publish', 'wordpress', 'content'],
        estimatedDuration: '5-30 seconds',
        requiresAuth: true,
        riskLevel: 'medium',
        sideEffects: ['creates publication', 'publishes to external platform'],
        idempotent: false,
      },
      {
        name: 'GetPublications',
        description: 'Retrieves publications with filtering and pagination',
        inputSchema: 'get-publications-input.json',
        outputSchema: 'get-publications-output.json',
        category: 'publishing',
        tags: ['query', 'publications', 'list'],
        estimatedDuration: '1-5 seconds',
        requiresAuth: true,
        riskLevel: 'low',
        sideEffects: [],
        idempotent: true,
      },
    ];
  }

  /**
   * Validates input against the use case's JSON schema
   */
  async validate(
    useCaseName: string,
    input: unknown
  ): Promise<Result<ValidationResult, AdminError>> {
    try {
      switch (useCaseName) {
        case 'PublishArticle':
          return this.validatePublishArticleInput(input);
        case 'GetPublications':
          return this.validateGetPublicationsInput(input);
        default:
          return Result.failure(AdminError.unknownUseCase(useCaseName));
      }
    } catch (error) {
      return Result.failure(
        AdminError.validationError(
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Executes a use case with the given input and options
   */
  async execute(
    useCaseName: string,
    input: unknown,
    options: ExecutionOptions = {}
  ): Promise<Result<ExecutionResult, AdminError>> {
    try {
      // Log the execution attempt
      this.logExecutionStart(useCaseName, input, options);

      // Validate input first
      const validationResult = await this.validate(useCaseName, input);
      if (validationResult.isFailure()) {
        this.logExecutionFailure(useCaseName, validationResult.error, options);
        return Result.failure(validationResult.error);
      }

      // Execute in dry-run mode if requested
      if (options.dryRun) {
        const dryRunResult = await this.executeDryRun(useCaseName, input, options);
        this.logExecutionSuccess(useCaseName, dryRunResult, options);
        return Result.success(dryRunResult);
      }

      // Execute the actual use case
      const result = await this.executeUseCase(useCaseName, input, options);

      if (result.isSuccess()) {
        this.logExecutionSuccess(useCaseName, result.value, options);
      } else {
        this.logExecutionFailure(useCaseName, result.error, options);
      }

      return result;

    } catch (error) {
      const adminError = AdminError.executionFailed(
        `Use case execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logExecutionFailure(useCaseName, adminError, options);
      return Result.failure(adminError);
    }
  }

  /**
   * Gets detailed information about a specific use case
   */
  getUseCaseInfo(useCaseName: string): Result<UseCaseInfo, AdminError> {
    const useCases = this.listUseCases();
    const useCase = useCases.find(uc => uc.name === useCaseName);

    if (!useCase) {
      return Result.failure(AdminError.unknownUseCase(useCaseName));
    }

    const info: UseCaseInfo = {
      ...useCase,
      examples: this.getUseCaseExamples(useCaseName),
      documentation: this.getUseCaseDocumentation(useCaseName),
      dependencies: this.getUseCaseDependencies(useCaseName),
    };

    return Result.success(info);
  }

  /**
   * Gets the health status of the publishing module
   */
  async getModuleHealth(): Promise<Result<ModuleHealth, AdminError>> {
    try {
      // Check dependencies and services
      const dependencies = await this.checkDependencies();
      const metrics = await this.getMetrics();

      const health: ModuleHealth = {
        moduleName: 'publishing',
        isHealthy: dependencies.every(dep => dep.isHealthy),
        dependencies,
        metrics,
        lastChecked: new Date(),
      };

      return Result.success(health);
    } catch (error) {
      return Result.failure(
        AdminError.healthCheckFailed(
          `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Validates PublishArticle input
   */
  private validatePublishArticleInput(input: unknown): Result<ValidationResult, AdminError> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object');
      return Result.failure(AdminError.validationError('Invalid input type'));
    }

    const typedInput = input as Record<string, unknown>;

    // Required fields
    if (!typedInput.articleId || typeof typedInput.articleId !== 'string') {
      errors.push('articleId is required and must be a string');
    }

    if (!typedInput.target || typeof typedInput.target !== 'object') {
      errors.push('target is required and must be an object');
    }

    if (!typedInput.content || typeof typedInput.content !== 'object') {
      errors.push('content is required and must be an object');
    } else {
      const content = typedInput.content as Record<string, unknown>;
      if (!content.title || typeof content.title !== 'string') {
        errors.push('content.title is required and must be a string');
      }
      if (!content.content || typeof content.content !== 'string') {
        errors.push('content.content is required and must be a string');
      }
    }

    if (!typedInput.metadata || typeof typedInput.metadata !== 'object') {
      errors.push('metadata is required and must be an object');
    }

    // Optional fields validation
    if (typedInput.scheduledAt !== undefined) {
      if (typeof typedInput.scheduledAt !== 'string' && !(typedInput.scheduledAt instanceof Date)) {
        errors.push('scheduledAt must be a valid date string or Date object');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedInput: this.normalizePublishArticleInput(typedInput),
    };

    return errors.length === 0
      ? Result.success(result)
      : Result.failure(AdminError.validationError(errors.join(', ')));
  }

  /**
   * Validates GetPublications input
   */
  private validateGetPublicationsInput(input: unknown): Result<ValidationResult, AdminError> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || typeof input !== 'object') {
      // Empty input is valid for GetPublications
      input = {};
    }

    const typedInput = input as Record<string, unknown>;

    // Optional fields validation
    if (typedInput.page !== undefined) {
      if (typeof typedInput.page !== 'number' || typedInput.page < 1) {
        errors.push('page must be a positive number');
      }
    }

    if (typedInput.limit !== undefined) {
      if (typeof typedInput.limit !== 'number' || typedInput.limit < 1 || typedInput.limit > 100) {
        errors.push('limit must be a number between 1 and 100');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedInput: this.normalizeGetPublicationsInput(typedInput),
    };

    return errors.length === 0
      ? Result.success(result)
      : Result.failure(AdminError.validationError(errors.join(', ')));
  }

  /**
   * Normalizes PublishArticle input by setting defaults
   */
  private normalizePublishArticleInput(input: Record<string, unknown>): PublishArticleInput {
    return {
      articleId: input.articleId as string,
      target: input.target as any, // Would need proper validation and conversion
      content: input.content as any,
      metadata: input.metadata as any,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt as string) : undefined,
      allowDuplicate: Boolean(input.allowDuplicate),
    };
  }

  /**
   * Normalizes GetPublications input by setting defaults
   */
  private normalizeGetPublicationsInput(input: Record<string, unknown>): GetPublicationsInput {
    return {
      articleId: input.articleId as string | undefined,
      status: input.status as string | undefined,
      platform: input.platform as string | undefined,
      dateRange: input.dateRange as any,
      excludeStatuses: input.excludeStatuses as string[] | undefined,
      retryableOnly: Boolean(input.retryableOnly),
      readyForExecution: Boolean(input.readyForExecution),
      page: (input.page as number) || 1,
      limit: (input.limit as number) || 50,
      sortBy: input.sortBy as any,
      sortOrder: (input.sortOrder as any) || 'desc',
    };
  }

  /**
   * Executes a use case in dry-run mode
   */
  private async executeDryRun(
    useCaseName: string,
    input: unknown,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    switch (useCaseName) {
      case 'PublishArticle':
        return {
          useCaseName,
          input,
          output: {
            publicationId: 'dry-run-publication-id',
            externalId: 'dry-run-external-id',
            externalUrl: 'https://example.com/dry-run-post',
            status: 'completed',
            publishedAt: new Date(),
            message: 'Dry run: Article would be published successfully'
          },
          executionTime: 0,
          isDryRun: true,
          metadata: {
            executedAt: new Date(),
            executedBy: options.userId || 'system',
            requestId: options.requestId || 'dry-run',
          },
        };
      case 'GetPublications':
        return {
          useCaseName,
          input,
          output: {
            publications: [],
            pagination: {
              page: 1,
              limit: 50,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false
            },
            filters: {}
          },
          executionTime: 0,
          isDryRun: true,
          metadata: {
            executedAt: new Date(),
            executedBy: options.userId || 'system',
            requestId: options.requestId || 'dry-run',
          },
        };
      default:
        throw new Error(`Dry run not implemented for ${useCaseName}`);
    }
  }

  /**
   * Executes the actual use case
   */
  private async executeUseCase(
    useCaseName: string,
    input: unknown,
    options: ExecutionOptions
  ): Promise<Result<ExecutionResult, AdminError>> {
    const startTime = Date.now();

    switch (useCaseName) {
      case 'PublishArticle':
        const publishResult = await this.publishArticle.execute(
          input as PublishArticleInput,
          {
            requestId: options.requestId,
            userId: options.userId,
            correlationId: options.correlationId,
            idempotencyKey: options.idempotencyKey,
          }
        );

        if (publishResult.isFailure()) {
          return Result.failure(AdminError.useCaseFailed(publishResult.error.message));
        }

        const executionResult: ExecutionResult = {
          useCaseName,
          input,
          output: publishResult.value,
          executionTime: Date.now() - startTime,
          isDryRun: false,
          metadata: {
            executedAt: new Date(),
            executedBy: options.userId || 'system',
            requestId: options.requestId || 'unknown',
          },
        };

        return Result.success(executionResult);

      case 'GetPublications':
        const getResult = await this.getPublications.execute(
          input as GetPublicationsInput,
          {
            requestId: options.requestId,
            userId: options.userId,
            correlationId: options.correlationId,
          }
        );

        if (getResult.isFailure()) {
          return Result.failure(AdminError.useCaseFailed(getResult.error.message));
        }

        const getExecutionResult: ExecutionResult = {
          useCaseName,
          input,
          output: getResult.value,
          executionTime: Date.now() - startTime,
          isDryRun: false,
          metadata: {
            executedAt: new Date(),
            executedBy: options.userId || 'system',
            requestId: options.requestId || 'unknown',
          },
        };

        return Result.success(getExecutionResult);

      default:
        return Result.failure(AdminError.unknownUseCase(useCaseName));
    }
  }

  /**
   * Gets example inputs for a use case
   */
  private getUseCaseExamples(useCaseName: string): Record<string, unknown>[] {
    switch (useCaseName) {
      case 'PublishArticle':
        return [
          {
            articleId: 'article-123',
            target: {
              platform: 'wordpress',
              siteId: 'my-site',
              siteUrl: 'https://myblog.com',
              configuration: {
                username: 'admin',
                password: 'app-password',
                status: 'publish'
              }
            },
            content: {
              title: 'My Article Title',
              content: '<p>Article content...</p>',
              excerpt: 'Article excerpt'
            },
            metadata: {
              categories: ['Technology'],
              tags: ['AI', 'Machine Learning']
            }
          }
        ];
      case 'GetPublications':
        return [
          {
            status: 'completed',
            page: 1,
            limit: 10
          },
          {
            articleId: 'article-123'
          },
          {
            platform: 'wordpress',
            retryableOnly: true
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Gets documentation for a use case
   */
  private getUseCaseDocumentation(useCaseName: string): string {
    switch (useCaseName) {
      case 'PublishArticle':
        return `
Publishes an article to a specified external platform.

The use case will:
1. Validate the target platform configuration
2. Check for duplicate publications (if not allowed)
3. Create a publication record
4. Execute the publishing process
5. Update the publication status

Supported platforms: WordPress, Social Media (coming soon)
        `.trim();
      case 'GetPublications':
        return `
Retrieves publications with flexible filtering and pagination.

Supported filters:
- Article ID
- Publication status
- Target platform
- Date range
- Retryable publications only
- Ready for execution

Results are paginated and can be sorted by various fields.
        `.trim();
      default:
        return 'No documentation available';
    }
  }

  /**
   * Gets dependencies for a use case
   */
  private getUseCaseDependencies(useCaseName: string): string[] {
    switch (useCaseName) {
      case 'PublishArticle':
        return ['PublicationRepository', 'PublishingService', 'Database', 'External Platform API'];
      case 'GetPublications':
        return ['PublicationRepository', 'Database'];
      default:
        return [];
    }
  }

  /**
   * Checks the health of module dependencies
   */
  private async checkDependencies(): Promise<DependencyHealth[]> {
    // In a real implementation, you would check actual dependencies
    return [
      {
        name: 'Database',
        type: 'database',
        isHealthy: true,
        latency: 5,
        lastChecked: new Date(),
      },
      {
        name: 'WordPress API',
        type: 'external_api',
        isHealthy: true,
        latency: 800,
        lastChecked: new Date(),
      },
    ];
  }

  /**
   * Gets current module metrics
   */
  private async getMetrics(): Promise<ModuleMetrics> {
    // In a real implementation, you would gather actual metrics
    return {
      totalPublications: 0,
      publicationsLast24h: 0,
      averagePublicationTime: 15,
      successRate: 0.98,
      errorRate: 0.02,
    };
  }

  /**
   * Logs the start of a use case execution
   */
  private logExecutionStart(
    useCaseName: string,
    input: unknown,
    options: ExecutionOptions
  ): void {
    console.log(`[PublishingAdmin] Starting execution of ${useCaseName}`, {
      useCaseName,
      requestId: options.requestId,
      userId: options.userId,
      dryRun: options.dryRun,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs successful use case execution
   */
  private logExecutionSuccess(
    useCaseName: string,
    result: any,
    options: ExecutionOptions
  ): void {
    console.log(`[PublishingAdmin] Successfully executed ${useCaseName}`, {
      useCaseName,
      requestId: options.requestId,
      userId: options.userId,
      dryRun: options.dryRun,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs failed use case execution
   */
  private logExecutionFailure(
    useCaseName: string,
    error: AdminError,
    options: ExecutionOptions
  ): void {
    console.error(`[PublishingAdmin] Failed to execute ${useCaseName}`, {
      useCaseName,
      requestId: options.requestId,
      userId: options.userId,
      dryRun: options.dryRun,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// Type definitions for the admin facade

export interface UseCaseMetadata {
  name: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
  category: string;
  tags: string[];
  estimatedDuration: string;
  requiresAuth: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  sideEffects: string[];
  idempotent: boolean;
}

export interface UseCaseInfo extends UseCaseMetadata {
  examples: Record<string, unknown>[];
  documentation: string;
  dependencies: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedInput: any;
}

export interface ExecutionOptions {
  dryRun?: boolean;
  idempotencyKey?: string;
  sandbox?: boolean;
  userId?: string;
  requestId?: string;
  correlationId?: string;
}

export interface ExecutionResult {
  useCaseName: string;
  input: unknown;
  output: any;
  executionTime: number;
  isDryRun: boolean;
  metadata: {
    executedAt: Date;
    executedBy: string;
    requestId: string;
  };
}

export interface ModuleHealth {
  moduleName: string;
  isHealthy: boolean;
  dependencies: DependencyHealth[];
  metrics: ModuleMetrics;
  lastChecked: Date;
}

export interface DependencyHealth {
  name: string;
  type: 'database' | 'external_api' | 'service' | 'queue';
  isHealthy: boolean;
  latency: number;
  lastChecked: Date;
  error?: string;
}

export interface ModuleMetrics {
  totalPublications: number;
  publicationsLast24h: number;
  averagePublicationTime: number;
  successRate: number;
  errorRate: number;
}

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly code: AdminErrorCode
  ) {
    super(message);
    this.name = 'AdminError';
  }

  static unknownUseCase(useCaseName: string): AdminError {
    return new AdminError(
      `Unknown use case: ${useCaseName}`,
      'UNKNOWN_USE_CASE'
    );
  }

  static validationError(message: string): AdminError {
    return new AdminError(
      `Validation error: ${message}`,
      'VALIDATION_ERROR'
    );
  }

  static executionFailed(message: string): AdminError {
    return new AdminError(
      `Execution failed: ${message}`,
      'EXECUTION_FAILED'
    );
  }

  static useCaseFailed(message: string): AdminError {
    return new AdminError(
      `Use case failed: ${message}`,
      'USE_CASE_FAILED'
    );
  }

  static healthCheckFailed(message: string): AdminError {
    return new AdminError(
      `Health check failed: ${message}`,
      'HEALTH_CHECK_FAILED'
    );
  }
}

export type AdminErrorCode =
  | 'UNKNOWN_USE_CASE'
  | 'VALIDATION_ERROR'
  | 'EXECUTION_FAILED'
  | 'USE_CASE_FAILED'
  | 'HEALTH_CHECK_FAILED';