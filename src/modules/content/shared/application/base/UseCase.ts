/**
 * Base classes for Use Cases in Clean Architecture.
 * Content Module specific implementation - completely independent.
 *
 * Use Cases represent the application-specific business rules.
 * They orchestrate the flow of data to and from the entities,
 * and direct those entities to use their enterprise-wide business rules.
 *
 * Key characteristics:
 * - Single responsibility: Each use case handles one business operation
 * - Framework independent: No dependencies on external frameworks
 * - Testable: Easy to test in isolation
 * - Explicit about inputs and outputs
 * - Handle cross-cutting concerns through context
 */
import { Result } from '../../domain/types/Result';

/**
 * Execution context passed to all use cases
 * Contains cross-cutting concerns like user info, tracing, etc.
 */
export interface ExecutionContext {
  userId?: string;
  correlationId?: string;
  timestamp?: Date;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Base class for all use cases
 */
export abstract class UseCase<TInput, TOutput, TError> {
  /**
   * Executes the use case with the given input and context
   */
  abstract execute(input: TInput, context?: ExecutionContext): Promise<Result<TOutput, TError>>;

  /**
   * Validates the input before execution
   * Override this method to implement input validation
   */
  protected async validateInput(input: TInput): Promise<Result<void, TError>> {
    return Result.success(undefined);
  }

  /**
   * Template method that can be overridden for common pre-execution logic
   */
  protected async beforeExecution(input: TInput, context?: ExecutionContext): Promise<void> {
    // Default implementation - override if needed
  }

  /**
   * Template method that can be overridden for common post-execution logic
   */
  protected async afterExecution(
    input: TInput,
    result: Result<TOutput, TError>,
    context?: ExecutionContext
  ): Promise<void> {
    // Default implementation - override if needed
  }

  /**
   * Creates an execution context with default values
   */
  protected createExecutionContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
    return {
      correlationId: this.generateCorrelationId(),
      timestamp: new Date(),
      ...overrides,
    };
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Base class for Command use cases (operations that change state)
 */
export abstract class CommandUseCase<TInput, TOutput, TError> extends UseCase<TInput, TOutput, TError> {
  /**
   * Executes the command with validation and hooks
   */
  async execute(input: TInput, context?: ExecutionContext): Promise<Result<TOutput, TError>> {
    const ctx = context || this.createExecutionContext();

    try {
      // Pre-execution hook
      await this.beforeExecution(input, ctx);

      // Validate input
      const validationResult = await this.validateInput(input);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Execute the command
      const result = await this.executeCommand(input, ctx);

      // Post-execution hook
      await this.afterExecution(input, result, ctx);

      return result;
    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Implement this method with the actual command logic
   */
  protected abstract executeCommand(input: TInput, context: ExecutionContext): Promise<Result<TOutput, TError>>;

  /**
   * Handle unexpected errors that escape the normal flow
   */
  protected abstract handleUnexpectedError(error: unknown): Result<TOutput, TError>;
}

/**
 * Base class for Query use cases (read-only operations)
 */
export abstract class QueryUseCase<TInput, TOutput, TError> extends UseCase<TInput, TOutput, TError> {
  /**
   * Executes the query with validation and hooks
   */
  async execute(input: TInput, context?: ExecutionContext): Promise<Result<TOutput, TError>> {
    const ctx = context || this.createExecutionContext();

    try {
      // Pre-execution hook
      await this.beforeExecution(input, ctx);

      // Validate input
      const validationResult = await this.validateInput(input);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Execute the query
      const result = await this.executeQuery(input, ctx);

      // Post-execution hook
      await this.afterExecution(input, result, ctx);

      return result;
    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Implement this method with the actual query logic
   */
  protected abstract executeQuery(input: TInput, context: ExecutionContext): Promise<Result<TOutput, TError>>;

  /**
   * Handle unexpected errors that escape the normal flow
   */
  protected abstract handleUnexpectedError(error: unknown): Result<TOutput, TError>;
}