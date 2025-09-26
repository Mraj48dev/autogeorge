import { Result } from '../../domain/types/Result';

/**
 * Base interface for use cases in the automation module.
 *
 * Use cases represent the application's business logic and orchestrate
 * the flow between domain entities and infrastructure services.
 */
export interface UseCase<TRequest, TResponse> {
  /**
   * Executes the use case with the given request.
   *
   * @param request The input data for the use case
   * @returns A Result containing either the response or an error
   */
  execute(request: TRequest): Promise<Result<TResponse, Error>>;
}

/**
 * Base interface for query use cases that don't modify state.
 */
export interface Query<TRequest, TResponse> {
  /**
   * Executes the query with the given request.
   *
   * @param request The query parameters
   * @returns A Result containing either the response or an error
   */
  execute(request: TRequest): Promise<Result<TResponse, Error>>;
}

/**
 * Base interface for command use cases that modify state.
 */
export interface Command<TRequest, TResponse = void> {
  /**
   * Executes the command with the given request.
   *
   * @param request The command data
   * @returns A Result containing either the response or an error
   */
  execute(request: TRequest): Promise<Result<TResponse, Error>>;
}