import { UseCase, ExecutionContext } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { Permission } from '../../domain/value-objects/Permission';
import { UserId } from '../../domain/value-objects/UserId';

export interface ValidatePermissionsInput {
  userId: string;
  requiredPermissions: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, user needs ANY permission
}

export interface ValidatePermissionsOutput {
  hasAccess: boolean;
  user: User;
  grantedPermissions: Permission[];
  deniedPermissions: Permission[];
}

export interface PermissionError {
  code: 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'INVALID_USER_ID' | 'INVALID_PERMISSIONS' | 'SYSTEM_ERROR';
  message: string;
}

/**
 * Port (interface) for User Repository
 */
export interface IUserRepository {
  findById(userId: UserId): Promise<User | null>;
}

/**
 * Use Case: Validate Permissions
 * Checks if a user has the required permissions to perform an action
 */
export class ValidatePermissions extends UseCase<
  ValidatePermissionsInput,
  ValidatePermissionsOutput,
  PermissionError
> {
  constructor(private userRepository: IUserRepository) {
    super();
  }

  protected async validateInput(
    input: ValidatePermissionsInput
  ): Promise<Result<ValidatePermissionsInput, PermissionError>> {
    try {
      // Validate user ID
      UserId.create(input.userId);

      // Validate permissions format
      if (!Array.isArray(input.requiredPermissions) || input.requiredPermissions.length === 0) {
        return Result.failure({
          code: 'INVALID_PERMISSIONS',
          message: 'Required permissions must be a non-empty array',
        });
      }

      // Validate each permission format
      for (const permissionStr of input.requiredPermissions) {
        try {
          Permission.create(permissionStr);
        } catch (error) {
          return Result.failure({
            code: 'INVALID_PERMISSIONS',
            message: `Invalid permission format: ${permissionStr}`,
          });
        }
      }

      return Result.success(input);
    } catch (error) {
      return Result.failure({
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID format',
      });
    }
  }

  protected async executeImpl(
    input: ValidatePermissionsInput,
    context: ExecutionContext
  ): Promise<Result<ValidatePermissionsOutput, PermissionError>> {
    try {
      const userId = UserId.create(input.userId);
      const requiredPermissions = input.requiredPermissions.map(p => Permission.create(p));
      const requireAll = input.requireAll ?? true;

      // Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return Result.failure({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return Result.failure({
          code: 'USER_INACTIVE',
          message: 'User account is deactivated',
        });
      }

      // Check permissions
      const grantedPermissions: Permission[] = [];
      const deniedPermissions: Permission[] = [];

      for (const permission of requiredPermissions) {
        if (user.hasPermission(permission)) {
          grantedPermissions.push(permission);
        } else {
          deniedPermissions.push(permission);
        }
      }

      // Determine access based on requireAll flag
      const hasAccess = requireAll
        ? deniedPermissions.length === 0
        : grantedPermissions.length > 0;

      return Result.success({
        hasAccess,
        user,
        grantedPermissions,
        deniedPermissions,
      });
    } catch (error) {
      return Result.failure({
        code: 'SYSTEM_ERROR',
        message: 'Permission validation failed due to system error',
      });
    }
  }
}