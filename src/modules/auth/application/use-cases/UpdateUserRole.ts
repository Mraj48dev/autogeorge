import { Result } from '../../../sources/shared/domain/types/Result';
import { BaseUseCase } from '../../../sources/shared/application/base/UseCase';
import { UserRepository } from '../../domain/ports/UserRepository';
import { UserRole, UserEntity } from '../../domain/user.entity';
import { AuthService } from '../../domain/auth-service.interface';

/**
 * Use case for updating user roles
 */
export class UpdateUserRole extends BaseUseCase<UpdateUserRoleRequest, UpdateUserRoleResponse> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService
  ) {
    super();
  }

  async execute(request: UpdateUserRoleRequest): Promise<Result<UpdateUserRoleResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateUpdateUserRoleRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Check if requesting user has admin permissions
      const currentUser = await this.authService.requireRole(UserRole.ADMIN);

      // Get target user
      const userResult = await this.userRepository.findById(request.userId);
      if (userResult.isFailure()) {
        return Result.failure(userResult.error);
      }

      const user = userResult.value;
      if (!user) {
        return Result.failure(new Error('User not found'));
      }

      // Prevent self-demotion from admin role
      if (user.id === currentUser.id && request.newRole !== UserRole.ADMIN) {
        return Result.failure(new Error('Cannot change your own admin role'));
      }

      // Update user role
      const updatedUser = new UserEntity(
        user.id,
        user.email,
        request.newRole,
        user.name,
        user.createdAt,
        user.lastSignInAt
      );

      const updateResult = await this.userRepository.update(updatedUser);
      if (updateResult.isFailure()) {
        return Result.failure(updateResult.error);
      }

      return Result.success({
        user: updateResult.value,
        message: `User role updated to ${request.newRole}`
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to update user role'));
    }
  }

  private validateUpdateUserRoleRequest(request: UpdateUserRoleRequest): Result<void, Error> {
    if (!request.userId) {
      return Result.failure(new Error('User ID is required'));
    }

    if (!request.newRole) {
      return Result.failure(new Error('New role is required'));
    }

    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(request.newRole)) {
      return Result.failure(new Error(`Invalid role. Valid roles: ${validRoles.join(', ')}`));
    }

    return Result.success(undefined);
  }
}

// Request interface
export interface UpdateUserRoleRequest {
  userId: string;
  newRole: UserRole;
}

// Response interface
export interface UpdateUserRoleResponse {
  user: UserEntity;
  message: string;
}