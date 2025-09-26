/**
 * Result type for handling success and failure cases in the automation module.
 *
 * This is the standard Result pattern used across the application to handle
 * operations that can succeed or fail without throwing exceptions.
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly success: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  public static success<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  public static failure<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public isSuccess(): boolean {
    return this.success;
  }

  public isFailure(): boolean {
    return !this.success;
  }

  public get value(): T {
    if (this.success && this._value !== undefined) {
      return this._value;
    }
    throw new Error('Cannot get value from failed result');
  }

  public get error(): E {
    if (!this.success && this._error !== undefined) {
      return this._error;
    }
    throw new Error('Cannot get error from successful result');
  }

  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isSuccess()) {
      return Result.success(fn(this.value));
    }
    return Result.failure(this.error);
  }

  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isSuccess()) {
      return fn(this.value);
    }
    return Result.failure(this.error);
  }

  public mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.isFailure()) {
      return Result.failure(fn(this.error));
    }
    return Result.success(this.value);
  }
}