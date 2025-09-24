import { Result } from '../../../../shared/domain/types/Result';

/**
 * Base class for Use Cases in the Publishing module.
 *
 * Use Cases represent application-specific business rules and orchestrate
 * the flow of data to and from the domain entities.
 */
export abstract class UseCase<TInput, TOutput, TError extends Error> {
  /**
   * Executes the use case with the given input
   */
  async execute(
    input: TInput,
    context?: ExecutionContext
  ): Promise<Result<TOutput, TError>> {
    try {
      this.logExecutionStart(input, context);
      
      const result = await this.executeImpl(input, context);
      
      if (result.isSuccess()) {
        this.logExecutionSuccess(input, result.value, context);
      } else {
        this.logExecutionFailure(input, result.error, context);
      }
      
      return result;
    } catch (error) {
      const executionError = this.handleUnexpectedError(error);
      this.logExecutionFailure(input, executionError, context);
      return Result.failure(executionError);
    }
  }

  /**
   * Abstract method to be implemented by concrete use cases
   */
  protected abstract executeImpl(
    input: TInput,
    context?: ExecutionContext
  ): Promise<Result<TOutput, TError>>;

  /**
   * Handles unexpected errors that occur during execution
   */
  protected abstract handleUnexpectedError(error: unknown): TError;

  /**
   * Logs the start of use case execution
   */
  protected logExecutionStart(input: TInput, context?: ExecutionContext): void {
    console.log(`[UseCase] Starting execution of ${this.constructor.name}`, {
      requestId: context?.requestId,
      userId: context?.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs successful use case execution
   */
  protected logExecutionSuccess(
    input: TInput,
    output: TOutput,
    context?: ExecutionContext
  ): void {
    console.log(`[UseCase] Successfully executed ${this.constructor.name}`, {
      requestId: context?.requestId,
      userId: context?.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs failed use case execution
   */
  protected logExecutionFailure(
    input: TInput,
    error: TError,
    context?: ExecutionContext
  ): void {
    console.error(`[UseCase] Failed to execute ${this.constructor.name}`, {
      requestId: context?.requestId,
      userId: context?.userId,
      error: {
        name: error.name,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Execution context for use cases
 */
export interface ExecutionContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}