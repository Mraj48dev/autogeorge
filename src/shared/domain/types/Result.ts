/**
 * Result type for handling success/failure scenarios without exceptions.
 *
 * This implements the Railway Oriented Programming pattern, ensuring that
 * all operations that can fail are explicit about their error conditions.
 *
 * Usage:
 * - Return Result.success(value) for successful operations
 * - Return Result.failure(error) for failed operations
 * - Use .isSuccess() and .isFailure() to check status
 * - Use .map() and .mapError() for transformations
 * - Use .flatMap() for chaining operations that return Results
 */
export abstract class Result<T, E> {
  /**
   * Creates a successful Result containing a value
   */
  static success<T, E>(value: T): Result<T, E> {
    return new Success(value);
  }

  /**
   * Creates a failed Result containing an error
   */
  static failure<T, E>(error: E): Result<T, E> {
    return new Failure(error);
  }

  /**
   * Combines multiple Results into a single Result.
   * Returns success only if all inputs are successful.
   */
  static combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];

    for (const result of results) {
      if (result.isFailure()) {
        return Result.failure(result.error);
      }
      values.push(result.value);
    }

    return Result.success(values);
  }

  abstract isSuccess(): this is Success<T, E>;
  abstract isFailure(): this is Failure<T, E>;
  abstract get value(): T;
  abstract get error(): E;

  /**
   * Transforms the value if this is a success, otherwise returns the failure unchanged
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isSuccess()) {
      return Result.success(fn(this.value));
    }
    return Result.failure(this.error);
  }

  /**
   * Transforms the error if this is a failure, otherwise returns the success unchanged
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.isFailure()) {
      return Result.failure(fn(this.error));
    }
    return Result.success(this.value);
  }

  /**
   * Chains operations that return Results, avoiding nested Result<Result<T, E>, E>
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isSuccess()) {
      return fn(this.value);
    }
    return Result.failure(this.error);
  }

  /**
   * Returns the value if success, otherwise returns the provided default
   */
  getOrElse(defaultValue: T): T {
    return this.isSuccess() ? this.value : defaultValue;
  }

  /**
   * Returns the value if success, otherwise calls the provided function with the error
   */
  getOrElseGet(fn: (error: E) => T): T {
    return this.isSuccess() ? this.value : fn(this.error);
  }

  /**
   * Executes side effect if success, returns the original Result
   */
  onSuccess(fn: (value: T) => void): Result<T, E> {
    if (this.isSuccess()) {
      fn(this.value);
    }
    return this;
  }

  /**
   * Executes side effect if failure, returns the original Result
   */
  onFailure(fn: (error: E) => void): Result<T, E> {
    if (this.isFailure()) {
      fn(this.error);
    }
    return this;
  }
}

class Success<T, E> extends Result<T, E> {
  constructor(private readonly _value: T) {
    super();
  }

  isSuccess(): this is Success<T, E> {
    return true;
  }

  isFailure(): this is Failure<T, E> {
    return false;
  }

  get value(): T {
    return this._value;
  }

  get error(): E {
    throw new Error('Cannot get error from Success');
  }
}

class Failure<T, E> extends Result<T, E> {
  constructor(private readonly _error: E) {
    super();
  }

  isSuccess(): this is Success<T, E> {
    return false;
  }

  isFailure(): this is Failure<T, E> {
    return true;
  }

  get value(): T {
    throw new Error('Cannot get value from Failure');
  }

  get error(): E {
    return this._error;
  }
}