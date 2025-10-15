import { QueryUseCase, ExecutionContext } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { UserId } from '../../domain/value-objects/UserId';
import { Email } from '../../domain/value-objects/Email';

export interface GetUserInput {
  userId?: string;
  email?: string;
}

export interface GetUserOutput {
  user: User;
}

export interface GetUserError {
  code: 'USER_NOT_FOUND' | 'INVALID_INPUT' | 'SYSTEM_ERROR';
  message: string;
}

/**
 * Port (interface) for User Repository
 */
export interface IUserRepository {
  findById(userId: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
}

/**
 * Use Case: Get User
 * Retrieves a user by ID or email
 */
export class GetUser extends QueryUseCase<
  GetUserInput,
  GetUserOutput,
  GetUserError
> {
  constructor(private userRepository: IUserRepository) {
    super();
  }

  protected async validateInput(
    input: GetUserInput
  ): Promise<Result<GetUserInput, GetUserError>> {
    if (!input.userId && !input.email) {
      return Result.failure({
        code: 'INVALID_INPUT',
        message: 'Either userId or email must be provided',
      });
    }

    if (input.userId && input.email) {
      return Result.failure({
        code: 'INVALID_INPUT',
        message: 'Provide either userId or email, not both',
      });
    }

    // Validate format if provided
    try {
      if (input.userId) {
        UserId.create(input.userId);
      }
      if (input.email) {
        Email.create(input.email);
      }
    } catch (error) {
      return Result.failure({
        code: 'INVALID_INPUT',
        message: 'Invalid userId or email format',
      });
    }

    return Result.success(input);
  }

  protected async executeQuery(
    input: GetUserInput,
    context: ExecutionContext
  ): Promise<Result<GetUserOutput, GetUserError>> {
    try {
      let user: User | null = null;

      if (input.userId) {
        const userId = UserId.create(input.userId);
        user = await this.userRepository.findById(userId);
      } else if (input.email) {
        const email = Email.create(input.email);
        user = await this.userRepository.findByEmail(email);
      }

      if (!user) {
        return Result.failure({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
      }

      return Result.success({ user });
    } catch (error) {
      return Result.failure({
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve user due to system error',
      });
    }
  }
}