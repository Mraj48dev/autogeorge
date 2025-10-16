import { UseCase } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { UserRepository } from '../../domain/ports/UserRepository';
import { UserId } from '../../domain/value-objects/UserId';
import { PermissionString } from '../../domain/value-objects/Permission';

export interface AuthorizeActionRequest {
  userId: string;
  permission: PermissionString;
  resourceId?: string;
  organizationId?: string;
}

export interface AuthorizeActionResponse {
  authorized: boolean;
  reason?: string;
}

export class AuthorizeAction extends UseCase<AuthorizeActionRequest, AuthorizeActionResponse> {
  constructor(
    private userRepository: UserRepository
  ) {
    super();
  }

  async execute(request: AuthorizeActionRequest): Promise<Result<AuthorizeActionResponse>> {
    try {
      const userIdResult = UserId.create(request.userId);
      if (userIdResult.isFailure()) {
        return Result.failure(`Invalid user ID: ${userIdResult.error}`);
      }

      // Find user
      const userResult = await this.userRepository.findById(userIdResult.value);
      if (userResult.isFailure()) {
        return Result.failure(`Failed to find user: ${userResult.error}`);
      }

      if (!userResult.value) {
        return Result.success({
          authorized: false,
          reason: 'User not found'
        });
      }

      const user = userResult.value;

      // Check if user is active
      if (!user.isActive) {
        return Result.success({
          authorized: false,
          reason: 'User is inactive'
        });
      }

      // Check organization context if provided
      if (request.organizationId && user.organizationId !== request.organizationId) {
        return Result.success({
          authorized: false,
          reason: 'User does not belong to the specified organization'
        });
      }

      // Check permission
      const hasPermission = user.hasPermission(request.permission);

      return Result.success({
        authorized: hasPermission,
        reason: hasPermission ? undefined : 'Insufficient permissions'
      });

    } catch (error) {
      return Result.failure(`Unexpected error during authorization: ${error}`);
    }
  }
}