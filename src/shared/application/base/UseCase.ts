import { Result } from '../../domain/types/Result';

/**
 * Base class for Use Cases in Clean Architecture.
 *
 * Use Cases represent the application's business logic and orchestrate
 * the flow of data between the UI and the domain entities. They are
 * the entry points for all application operations.
 *
 * Key principles:
 * - Single Responsibility: Each use case has one clear purpose
 * - Dependency Inversion: Depends on abstractions (ports), not concretions
 * - Error Handling: Returns Result types instead of throwing exceptions
 * - Validation: Validates input before processing
 * - Idempotency: Operations can be safely retried
 * - Logging: All operations are logged for observability
 *
 * Generic types:
 * - TInput: The input data for the use case
 * - TOutput: The successful output data
 * - TError: The error type for failures
 */
export abstract class UseCase<TInput, TOutput, TError = Error> {
  /**
   * Executes the use case with the provided input.
   * This is the main entry point that orchestrates the entire operation.
   *
   * @param input The input data for the use case
   * @param context Optional execution context (user info, request ID, etc.)
   * @returns A Result containing either the success output or an error
   */
  async execute(
    input: TInput,
    context: ExecutionContext = {}
  ): Promise<Result<TOutput, TError>> {
    try {
      // Log the start of execution
      this.logExecutionStart(input, context);

      // Validate input data
      const validationResult = await this.validateInput(input);
      if (validationResult.isFailure()) {
        this.logExecutionFailure(validationResult.error, context);
        return validationResult;
      }

      // Execute the main business logic
      const result = await this.executeImpl(input, context);

      // Log the result
      if (result.isSuccess()) {
        this.logExecutionSuccess(result.value, context);
      } else {
        this.logExecutionFailure(result.error, context);
      }

      return result;
    } catch (error) {
      // Handle any unexpected errors
      const errorResult = this.handleUnexpectedError(error as Error);
      this.logExecutionFailure(errorResult.error, context);
      return errorResult;
    }
  }

  /**
   * Validates the input data before execution.
   * Override this method to implement specific validation logic.
   *
   * @param input The input to validate
   * @returns A Result indicating validation success or failure
   */
  protected async validateInput(input: TInput): Promise<Result<TInput, TError>> {
    // Default implementation - no validation
    return Result.success(input);
  }

  /**
   * Implements the actual business logic of the use case.
   * This method must be implemented by concrete use cases.
   *
   * @param input The validated input data
   * @param context The execution context
   * @returns A Result containing the output or an error
   */
  protected abstract executeImpl(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput, TError>>;

  /**
   * Handles unexpected errors that occur during execution.
   * Override this method to customize error handling.
   *
   * @param error The unexpected error
   * @returns A Result containing the processed error
   */
  protected handleUnexpectedError(error: Error): Result<TOutput, TError> {
    return Result.failure(error as TError);
  }

  /**
   * Returns the name of this use case for logging and debugging.
   * By default, uses the class name.
   */
  protected getUseCaseName(): string {
    return this.constructor.name;
  }

  /**
   * Logs the start of use case execution
   */
  private logExecutionStart(input: TInput, context: ExecutionContext): void {
    console.log(`[${this.getUseCaseName()}] Starting execution`, {
      useCaseName: this.getUseCaseName(),
      requestId: context.requestId,
      userId: context.userId,
      timestamp: new Date().toISOString(),
      // Note: In production, be careful not to log sensitive data
      inputKeys: input ? Object.keys(input as any) : [],
    });
  }

  /**
   * Logs successful use case execution
   */
  private logExecutionSuccess(output: TOutput, context: ExecutionContext): void {
    console.log(`[${this.getUseCaseName()}] Execution completed successfully`, {
      useCaseName: this.getUseCaseName(),
      requestId: context.requestId,
      userId: context.userId,
      timestamp: new Date().toISOString(),
      outputKeys: output ? Object.keys(output as any) : [],
    });
  }

  /**
   * Logs failed use case execution
   */
  private logExecutionFailure(error: TError, context: ExecutionContext): void {
    console.error(`[${this.getUseCaseName()}] Execution failed`, {
      useCaseName: this.getUseCaseName(),
      requestId: context.requestId,
      userId: context.userId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
  }
}

/**
 * Execution context provides additional information about the request
 */
export interface ExecutionContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  userAgent?: string;
  ipAddress?: string;
  dryRun?: boolean;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

/**
 * Base class for Command Use Cases (operations that modify state)
 */
export abstract class CommandUseCase<TInput, TOutput, TError = Error>
  extends UseCase<TInput, TOutput, TError> {

  /**
   * Commands should be idempotent when possible.
   * Override this method to implement idempotency checking.
   */
  protected async checkIdempotency(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput | null, TError>> {
    // Default implementation - no idempotency check
    return Result.success(null);
  }

  /**
   * Template method that includes idempotency checking for commands
   */
  protected async executeImpl(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput, TError>> {
    // Check for idempotency if key is provided
    if (context.idempotencyKey) {
      const idempotencyResult = await this.checkIdempotency(input, context);
      if (idempotencyResult.isFailure()) {
        return idempotencyResult;
      }
      if (idempotencyResult.value !== null) {
        // Return cached result
        return Result.success(idempotencyResult.value);
      }
    }

    // Execute the command
    return this.executeCommand(input, context);
  }

  /**
   * Implements the actual command logic
   */
  protected abstract executeCommand(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput, TError>>;
}

/**
 * Base class for Query Use Cases (operations that read state)
 */
export abstract class QueryUseCase<TInput, TOutput, TError = Error>
  extends UseCase<TInput, TOutput, TError> {

  /**
   * Queries are typically cacheable.
   * Override this method to implement caching.
   */
  protected async getCachedResult(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput | null, TError>> {
    // Default implementation - no caching
    return Result.success(null);
  }

  /**
   * Template method that includes caching for queries
   */
  protected async executeImpl(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput, TError>> {
    // Check cache first
    const cacheResult = await this.getCachedResult(input, context);
    if (cacheResult.isFailure()) {
      return cacheResult;
    }
    if (cacheResult.value !== null) {
      return Result.success(cacheResult.value);
    }

    // Execute the query
    const result = await this.executeQuery(input, context);

    // Cache the result if successful
    if (result.isSuccess()) {
      await this.cacheResult(input, result.value, context);
    }

    return result;
  }

  /**
   * Implements the actual query logic
   */
  protected abstract executeQuery(
    input: TInput,
    context: ExecutionContext
  ): Promise<Result<TOutput, TError>>;

  /**
   * Caches the query result
   */
  protected async cacheResult(
    input: TInput,
    output: TOutput,
    context: ExecutionContext
  ): Promise<void> {
    // Default implementation - no caching
  }
}