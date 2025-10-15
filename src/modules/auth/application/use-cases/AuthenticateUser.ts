import { Result } from '../../../sources/shared/domain/types/Result';
import { BaseUseCase } from '../../../sources/shared/application/base/UseCase';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuthService, ClerkUserData } from '../../domain/ports/AuthService';
import { User } from '../../domain/entities/User';
import { UserEmail } from '../../domain/value-objects/UserEmail';
import { UserName } from '../../domain/value-objects/UserName';

/**
 * Use case for authenticating users via Clerk
 * Handles user authentication and registration flow
 */
export class AuthenticateUser extends BaseUseCase<AuthenticateUserRequest, AuthenticateUserResponse> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService
  ) {
    super();
  }

  async execute(request: AuthenticateUserRequest): Promise<Result<AuthenticateUserResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Get current user from Clerk
      const clerkUser = await this.authService.getCurrentUser();
      if (!clerkUser) {
        return Result.failure(new Error('No authenticated user found'));
      }

      // Find existing user by Clerk ID
      let user = await this.userRepository.findByExternalAuthProviderId(clerkUser.id);

      if (!user) {
        // User doesn't exist in our system, create new user
        const createUserResult = await this.createUserFromClerk(clerkUser);
        if (createUserResult.isFailure()) {
          return Result.failure(createUserResult.error);
        }
        user = createUserResult.value;
      } else {
        // Update user login timestamp
        user.recordLogin();
        await this.userRepository.save(user);
      }

      // Check if user can access the platform
      if (!user.canAccess()) {
        return Result.failure(new Error(`User account is ${user.status.getValue()}. Please contact support.`));
      }

      return Result.success({
        user: user,
        isNewUser: !user.lastLoginAt,
        message: 'Authentication successful'
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to authenticate user'));
    }
  }

  private async createUserFromClerk(clerkUser: ClerkUserData): Promise<Result<User, Error>> {
    try {
      // Create value objects
      const email = UserEmail.fromString(clerkUser.email);
      const name = UserName.fromString(clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User');

      // Check if email already exists (shouldn't happen, but safety check)
      const emailExists = await this.userRepository.emailExists(email);
      if (emailExists) {
        return Result.failure(new Error('User with this email already exists'));
      }

      // Create new user
      const user = User.createFromClerk(
        email,
        name,
        clerkUser.id,
        clerkUser.imageUrl
      );

      // Record the initial login
      user.recordLogin();

      // Save user
      await this.userRepository.save(user);

      return Result.success(user);

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to create user from Clerk data'));
    }
  }

  private validateAuthenticateRequest(request: AuthenticateUserRequest): Result<void, Error> {
    // Currently no specific validation needed for authentication
    // Clerk handles the authentication validation
    return Result.success(undefined);
  }
}

// Request interface
export interface AuthenticateUserRequest {
  // Empty for now - Clerk handles authentication automatically
  // Could add custom fields if needed in the future
}

// Response interface
export interface AuthenticateUserResponse {
  user: User;
  isNewUser: boolean;
  message: string;
}