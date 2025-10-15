import { Result } from '../../../sources/shared/domain/types/Result';
import { BaseUseCase } from '../../../sources/shared/application/base/UseCase';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuthService } from '../../domain/ports/AuthService';
import { User } from '../../domain/entities/User';

/**
 * Use case for getting the current authenticated user
 */
export class GetCurrentUser extends BaseUseCase<GetCurrentUserRequest, GetCurrentUserResponse> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService
  ) {
    super();
  }

  async execute(request: GetCurrentUserRequest): Promise<Result<GetCurrentUserResponse, Error>> {
    try {
      // Get current user from Clerk
      const clerkUser = await this.authService.getCurrentUser();
      if (!clerkUser) {
        return Result.failure(new Error('No authenticated user found'));
      }

      // Find user in our system
      const user = await this.userRepository.findByExternalAuthProviderId(clerkUser.id);
      if (!user) {
        return Result.failure(new Error('User not found in system. Please sign in again.'));
      }

      // Check if user can access the platform
      if (!user.canAccess()) {
        return Result.failure(new Error(`User account is ${user.status.getValue()}. Please contact support.`));
      }

      return Result.success({
        user: user,
        message: 'Current user retrieved successfully'
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to get current user'));
    }
  }
}

// Request interface
export interface GetCurrentUserRequest {
  // Empty for now
}

// Response interface
export interface GetCurrentUserResponse {
  user: User;
  message: string;
}