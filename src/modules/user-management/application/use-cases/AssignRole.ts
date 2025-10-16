import { UseCase } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { UserId } from '../../domain/value-objects/UserId';
import { UserRole, UserRoleType } from '../../domain/value-objects/UserRole';
import { AuthenticationService } from '../../domain/ports/AuthenticationService';

export interface AssignRoleRequest {
  userId: string;
  newRole: UserRoleType;
  assignedBy: string; // User ID of the person making the assignment
}

export interface AssignRoleResponse {
  user: User;
  previousRole: UserRoleType;
}

export class AssignRole extends UseCase<AssignRoleRequest, AssignRoleResponse> {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthenticationService
  ) {
    super();
  }

  async execute(request: AssignRoleRequest): Promise<Result<AssignRoleResponse>> {
    try {
      // Validate user IDs
      const userIdResult = UserId.create(request.userId);
      if (userIdResult.isFailure()) {
        return Result.failure(`Invalid user ID: ${userIdResult.error}`);
      }

      const assignedByIdResult = UserId.create(request.assignedBy);
      if (assignedByIdResult.isFailure()) {
        return Result.failure(`Invalid assignedBy ID: ${assignedByIdResult.error}`);
      }

      // Create new role
      const newRoleResult = UserRole.create(request.newRole);
      if (newRoleResult.isFailure()) {
        return Result.failure(`Invalid role: ${newRoleResult.error}`);
      }

      // Find the user to update
      const userResult = await this.userRepository.findById(userIdResult.value);
      if (userResult.isFailure()) {
        return Result.failure(`Failed to find user: ${userResult.error}`);
      }

      if (!userResult.value) {
        return Result.failure('User not found');
      }

      // Find the user who is making the assignment
      const assignerResult = await this.userRepository.findById(assignedByIdResult.value);
      if (assignerResult.isFailure()) {
        return Result.failure(`Failed to find assigner: ${assignerResult.error}`);
      }

      if (!assignerResult.value) {
        return Result.failure('Assigner not found');
      }

      const user = userResult.value;
      const assigner = assignerResult.value;

      // Check if assigner has permission to assign this role
      if (!assigner.canManageUser(user)) {
        return Result.failure('Insufficient permissions to assign role to this user');
      }

      // Check if assigner can assign the new role
      if (!assigner.role.canManageRole(newRoleResult.value)) {
        return Result.failure('Insufficient permissions to assign this role level');
      }

      const previousRole = user.role.value;

      // Update user role
      const updatedUserResult = user.updateRole(newRoleResult.value);
      if (updatedUserResult.isFailure()) {
        return Result.failure(`Failed to update user role: ${updatedUserResult.error}`);
      }

      // Save to repository
      const saveResult = await this.userRepository.save(updatedUserResult.value);
      if (saveResult.isFailure()) {
        return Result.failure(`Failed to save user: ${saveResult.error}`);
      }

      // Update external auth provider if user has external ID
      if (saveResult.value.clerkUserId) {
        const updateExternalResult = await this.authService.updateExternalUser(
          saveResult.value.clerkUserId,
          { role: request.newRole }
        );

        if (updateExternalResult.isFailure()) {
          // Log warning but don't fail the operation
          console.warn(`Failed to update external user role: ${updateExternalResult.error}`);
        }
      }

      return Result.success({
        user: saveResult.value,
        previousRole
      });

    } catch (error) {
      return Result.failure(`Unexpected error assigning role: ${error}`);
    }
  }
}