import { Result } from '../../domain/types/Result';

/**
 * Base use case interface for Sources module
 * Ensures consistency across all use cases
 */
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse, Error>>;
}

/**
 * Base implementation for use cases with common functionality
 */
export abstract class BaseUseCase<TRequest, TResponse> implements UseCase<TRequest, TResponse> {
  abstract execute(request: TRequest): Promise<Result<TResponse, Error>>;

  protected validateRequest(request: TRequest): Result<void, Error> {
    if (!request) {
      return Result.failure(new Error('Request cannot be null or undefined'));
    }
    return Result.success(undefined);
  }

  protected handleError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: Unknown error occurred`);
  }
}