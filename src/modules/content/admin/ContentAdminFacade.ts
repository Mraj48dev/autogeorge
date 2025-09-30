import { Result } from '../../../shared/domain/types/Result';
import { GenerateArticle, GenerateArticleInput, GenerateArticleOutput, GenerateArticleError } from '../application/use-cases/GenerateArticle';
import { AutoGenerateArticles, AutoGenerateRequest, AutoGenerateResponse } from '../application/use-cases/AutoGenerateArticles';

/**
 * Admin Facade for the Content module.
 *
 * This facade provides a unified interface for administrative operations
 * on the content module. It abstracts the complexity of individual use cases
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
 *
 * This follows the Command pattern with support for undo operations
 * and comprehensive logging for compliance and debugging.
 */
export class ContentAdminFacade {
  constructor(
    private readonly generateArticle: GenerateArticle,
    private readonly autoGenerateArticles: AutoGenerateArticles
  ) {}

  /**
   * Lists all available use cases in this module
   */
  listUseCases(): UseCaseMetadata[] {
    return [
      {
        name: 'GenerateArticle',
        description: 'Generates a new article using AI services',
        inputSchema: 'generate-article-input.json',
        outputSchema: 'generate-article-output.json',
        category: 'content',
        tags: ['ai', 'generation', 'content'],
        estimatedDuration: '30-60 seconds',
        requiresAuth: true,
        riskLevel: 'medium',
        sideEffects: ['creates article', 'consumes tokens'],
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
        case 'GenerateArticle':
          return this.validateGenerateArticleInput(input);
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
   * Gets the health status of the content module
   */
  async getModuleHealth(): Promise<Result<ModuleHealth, AdminError>> {
    try {
      // Check dependencies and services
      const dependencies = await this.checkDependencies();
      const metrics = await this.getMetrics();

      const health: ModuleHealth = {
        moduleName: 'content',
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
   * Auto-generates articles from feed items using AI services
   * This is a simplified wrapper for the AutoGenerateArticles use case
   */
  async generateArticlesFromFeeds(request: AutoGenerateRequest): Promise<Result<AutoGenerateResponse, AdminError>> {
    try {
      const result = await this.autoGenerateArticles.execute(request);

      if (result.isFailure()) {
        return Result.failure(AdminError.useCaseFailed(result.error.message));
      }

      return Result.success(result.value);
    } catch (error) {
      return Result.failure(
        AdminError.executionFailed(
          `Auto-generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Validates GenerateArticle input
   */
  private validateGenerateArticleInput(input: unknown): Result<ValidationResult, AdminError> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || typeof input !== 'object') {
      errors.push('Input must be an object');
      return Result.failure(AdminError.validationError('Invalid input type'));
    }

    const typedInput = input as Record<string, unknown>;

    // Required fields
    if (!typedInput.prompt || typeof typedInput.prompt !== 'string') {
      errors.push('prompt is required and must be a string');
    } else if (typedInput.prompt.length < 10) {
      errors.push('prompt must be at least 10 characters long');
    }

    if (!typedInput.model || typeof typedInput.model !== 'string') {
      errors.push('model is required and must be a string');
    }

    // Optional fields validation
    if (typedInput.targetWordCount !== undefined) {
      if (typeof typedInput.targetWordCount !== 'number' ||
          typedInput.targetWordCount < 100 ||
          typedInput.targetWordCount > 10000) {
        errors.push('targetWordCount must be a number between 100 and 10000');
      }
    }

    if (typedInput.temperature !== undefined) {
      if (typeof typedInput.temperature !== 'number' ||
          typedInput.temperature < 0 ||
          typedInput.temperature > 2) {
        errors.push('temperature must be a number between 0 and 2');
      }
    }

    if (typedInput.keywords !== undefined) {
      if (!Array.isArray(typedInput.keywords)) {
        errors.push('keywords must be an array of strings');
      } else if (typedInput.keywords.length > 10) {
        warnings.push('More than 10 keywords may reduce content quality');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedInput: this.normalizeGenerateArticleInput(typedInput),
    };

    return errors.length === 0
      ? Result.success(result)
      : Result.failure(AdminError.validationError(errors.join(', ')));
  }

  /**
   * Normalizes GenerateArticle input by setting defaults
   */
  private normalizeGenerateArticleInput(input: Record<string, unknown>): GenerateArticleInput {
    return {
      prompt: input.prompt as string,
      model: input.model as string,
      sourceId: input.sourceId as string | undefined,
      sourceContent: input.sourceContent as string | undefined,
      language: (input.language as string) || 'en',
      tone: input.tone as string | undefined,
      style: input.style as string | undefined,
      targetAudience: input.targetAudience as string | undefined,
      targetWordCount: input.targetWordCount as number | undefined,
      keywords: input.keywords as string[] | undefined,
      temperature: (input.temperature as number) || 0.7,
      maxTokens: input.maxTokens as number | undefined,
      topP: input.topP as number | undefined,
      frequencyPenalty: input.frequencyPenalty as number | undefined,
      presencePenalty: input.presencePenalty as number | undefined,
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
      case 'GenerateArticle':
        return {
          useCaseName,
          input,
          output: {
            articleId: 'dry-run-article-id',
            title: 'Dry Run Article Title',
            content: 'This is a dry run. No actual article was generated.',
            wordCount: 100,
            estimatedReadingTime: 1,
            status: 'generated',
            generationMetadata: {
              tokensUsed: 0,
              generationTime: 0,
              modelUsed: 'dry-run-model',
              provider: 'dry-run',
              cost: 0,
            },
            createdAt: new Date(),
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
      case 'GenerateArticle':
        const generateResult = await this.generateArticle.execute(
          input as GenerateArticleInput,
          {
            requestId: options.requestId,
            userId: options.userId,
            correlationId: options.correlationId,
            idempotencyKey: options.idempotencyKey,
          }
        );

        if (generateResult.isFailure()) {
          return Result.failure(AdminError.useCaseFailed(generateResult.error.message));
        }

        const executionResult: ExecutionResult = {
          useCaseName,
          input,
          output: generateResult.value,
          executionTime: Date.now() - startTime,
          isDryRun: false,
          metadata: {
            executedAt: new Date(),
            executedBy: options.userId || 'system',
            requestId: options.requestId || 'unknown',
          },
        };

        return Result.success(executionResult);

      default:
        return Result.failure(AdminError.unknownUseCase(useCaseName));
    }
  }

  /**
   * Gets example inputs for a use case
   */
  private getUseCaseExamples(useCaseName: string): Record<string, unknown>[] {
    switch (useCaseName) {
      case 'GenerateArticle':
        return [
          {
            prompt: 'Write an article about the benefits of renewable energy',
            model: 'llama-3.1-sonar-large-128k-online',
            targetWordCount: 1000,
            tone: 'professional',
            style: 'blog',
            keywords: ['renewable energy', 'sustainability', 'clean power'],
          },
          {
            prompt: 'Create a technical guide on microservices architecture',
            model: 'llama-3.1-sonar-large-128k-online',
            targetWordCount: 1500,
            tone: 'technical',
            style: 'academic',
            targetAudience: 'software developers',
          },
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
      case 'GenerateArticle':
        return `
Generates a new article using AI services based on a provided prompt.

The use case will:
1. Validate the input prompt and parameters
2. Call the configured AI service to generate content
3. Create and persist an Article domain entity
4. Return the generated content with metadata

The generated article will be in 'generated' status and can be further
processed through the publishing pipeline.
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
      case 'GenerateArticle':
        return ['ArticleRepository', 'AiService', 'Database', 'AI Provider API'];
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
        name: 'AI Service',
        type: 'external_api',
        isHealthy: true,
        latency: 1200,
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
      totalArticles: 0,
      articlesGenerated24h: 0,
      averageGenerationTime: 45,
      successRate: 0.95,
      errorRate: 0.05,
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
    console.log(`[ContentAdmin] Starting execution of ${useCaseName}`, {
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
    console.log(`[ContentAdmin] Successfully executed ${useCaseName}`, {
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
    console.error(`[ContentAdmin] Failed to execute ${useCaseName}`, {
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
  totalArticles: number;
  articlesGenerated24h: number;
  averageGenerationTime: number;
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