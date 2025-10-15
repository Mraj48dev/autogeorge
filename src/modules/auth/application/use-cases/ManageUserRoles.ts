import { CommandUseCase, ExecutionContext } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { Role } from '../../domain/value-objects/Role';
import { Permission } from '../../domain/value-objects/Permission';
import { UserId } from '../../domain/value-objects/UserId';

export interface ManageUserRolesInput {
  userId: string;
  action: 'CHANGE_ROLE' | 'GRANT_PERMISSIONS' | 'REVOKE_PERMISSIONS';
  role?: string;
  permissions?: string[];
}

export interface ManageUserRolesOutput {
  user: User;
  previousRole?: Role;
  addedPermissions?: Permission[];
  removedPermissions?: Permission[];
}

export interface RoleManagementError {
  code: 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'INVALID_ROLE' | 'INVALID_PERMISSIONS' | 'UNAUTHORIZED' | 'SYSTEM_ERROR';
  message: string;
}

/**
 * Port (interface) for User Repository
 */
export interface IUserRepository {
  findById(userId: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

/**
 * Use Case: Manage User Roles
 * Handles role changes and permission management for users
 */
export class ManageUserRoles extends CommandUseCase<
  ManageUserRolesInput,
  ManageUserRolesOutput,
  RoleManagementError
> {
  constructor(private userRepository: IUserRepository) {
    super();
  }

  protected async validateInput(
    input: ManageUserRolesInput
  ): Promise<Result<ManageUserRolesInput, RoleManagementError>> {
    try {
      // Validate user ID
      UserId.create(input.userId);

      // Validate action-specific inputs
      switch (input.action) {
        case 'CHANGE_ROLE':
          if (!input.role) {
            return Result.failure({
              code: 'INVALID_ROLE',
              message: 'Role is required for CHANGE_ROLE action',
            });
          }
          try {
            Role.create(input.role);
          } catch (error) {
            return Result.failure({
              code: 'INVALID_ROLE',
              message: `Invalid role: ${input.role}`,
            });
          }
          break;

        case 'GRANT_PERMISSIONS':
        case 'REVOKE_PERMISSIONS':
          if (!input.permissions || input.permissions.length === 0) {
            return Result.failure({
              code: 'INVALID_PERMISSIONS',
              message: 'Permissions are required for permission management actions',
            });
          }

          // Validate each permission
          for (const permissionStr of input.permissions) {
            try {
              Permission.create(permissionStr);
            } catch (error) {
              return Result.failure({
                code: 'INVALID_PERMISSIONS',
                message: `Invalid permission: ${permissionStr}`,
              });
            }
          }
          break;

        default:
          return Result.failure({
            code: 'INVALID_PERMISSIONS',
            message: 'Invalid action specified',
          });
      }

      return Result.success(input);
    } catch (error) {
      return Result.failure({
        code: 'INVALID_PERMISSIONS',
        message: 'Invalid input format',
      });
    }
  }

  protected async executeCommand(
    input: ManageUserRolesInput,
    context: ExecutionContext
  ): Promise<Result<ManageUserRolesOutput, RoleManagementError>> {
    try {
      const userId = UserId.create(input.userId);

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
          message: 'Cannot modify roles for inactive user',
        });
      }

      let result: ManageUserRolesOutput;

      switch (input.action) {
        case 'CHANGE_ROLE':
          result = await this.changeUserRole(user, input.role!);
          break;

        case 'GRANT_PERMISSIONS':
          result = await this.grantPermissions(user, input.permissions!);
          break;

        case 'REVOKE_PERMISSIONS':
          result = await this.revokePermissions(user, input.permissions!);
          break;

        default:
          return Result.failure({
            code: 'SYSTEM_ERROR',
            message: 'Unknown action',
          });
      }

      // Save the updated user
      await this.userRepository.save(user);

      return Result.success(result);
    } catch (error) {
      return Result.failure({
        code: 'SYSTEM_ERROR',
        message: 'Role management failed due to system error',
      });
    }
  }

  private async changeUserRole(
    user: User,
    newRoleStr: string
  ): Promise<ManageUserRolesOutput> {
    const previousRole = user.role;
    const newRole = Role.create(newRoleStr);

    user.changeRole(newRole);

    return {
      user,
      previousRole,
    };
  }

  private async grantPermissions(
    user: User,
    permissionStrs: string[]
  ): Promise<ManageUserRolesOutput> {
    const permissions = permissionStrs.map(p => Permission.create(p));

    // Filter out permissions the user already has
    const addedPermissions = permissions.filter(
      permission => !user.hasPermission(permission)
    );

    if (addedPermissions.length > 0) {
      user.grantPermissions(addedPermissions);
    }

    return {
      user,
      addedPermissions,
    };
  }

  private async revokePermissions(
    user: User,
    permissionStrs: string[]
  ): Promise<ManageUserRolesOutput> {
    const permissions = permissionStrs.map(p => Permission.create(p));

    // Filter to only permissions the user actually has
    const removedPermissions = permissions.filter(
      permission => user.hasPermission(permission)
    );

    if (removedPermissions.length > 0) {
      user.revokePermissions(removedPermissions);
    }

    return {
      user,
      removedPermissions,
    };
  }

  /**
   * Additional authorization check for this use case
   */
  protected async validateAuthorization(
    input: ManageUserRolesInput,
    context: ExecutionContext
  ): Promise<Result<void, RoleManagementError>> {
    // This would typically check if the requesting user has permission to manage roles
    // For now, we assume the caller has already been authorized

    // In a real implementation, you might do:
    // const requestingUserId = context.userId;
    // if (!requestingUserId) {
    //   return Result.failure({
    //     code: 'UNAUTHORIZED',
    //     message: 'Authentication required',
    //   });
    // }

    // const requestingUser = await this.userRepository.findById(UserId.create(requestingUserId));
    // if (!requestingUser?.hasPermission(Permission.create('user:update'))) {
    //   return Result.failure({
    //     code: 'UNAUTHORIZED',
    //     message: 'Insufficient permissions to manage user roles',
    //   });
    // }

    return Result.success(undefined);
  }
}