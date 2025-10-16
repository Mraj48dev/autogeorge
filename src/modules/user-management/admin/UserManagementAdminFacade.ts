import { Result } from '@/shared/domain/types/Result';
import { User } from '../domain/entities/User';
import { UserRoleType } from '../domain/value-objects/UserRole';
import { PermissionString } from '../domain/value-objects/Permission';

// Use Cases
import { CreateUser, CreateUserRequest, CreateUserResponse } from '../application/use-cases/CreateUser';
import { AuthorizeAction, AuthorizeActionRequest, AuthorizeActionResponse } from '../application/use-cases/AuthorizeAction';
import { AssignRole, AssignRoleRequest, AssignRoleResponse } from '../application/use-cases/AssignRole';
import { GetUsers, GetUsersRequest, GetUsersResponse } from '../application/use-cases/GetUsers';

export interface UserManagementHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    userRepository: boolean;
    authService: boolean;
    permissionSystem: boolean;
  };
  userCount: number;
  activeUserCount: number;
}

export class UserManagementAdminFacade {
  constructor(
    private createUserUseCase: CreateUser,
    private authorizeActionUseCase: AuthorizeAction,
    private assignRoleUseCase: AssignRole,
    private getUsersUseCase: GetUsers
  ) {}

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    return this.createUserUseCase.execute(request);
  }

  /**
   * Check if a user has permission to perform an action
   */
  async checkPermission(
    userId: string,
    permission: PermissionString,
    resourceId?: string,
    organizationId?: string
  ): Promise<Result<boolean>> {
    const result = await this.authorizeAction.execute({
      userId,
      permission,
      resourceId,
      organizationId
    });

    if (result.isFailure()) {
      return Result.failure(result.error);
    }

    return Result.success(result.value.authorized);
  }

  /**
   * Authorize an action (with detailed response)
   */
  async authorizeAction(request: AuthorizeActionRequest): Promise<Result<AuthorizeActionResponse>> {
    return this.authorizeAction.execute(request);
  }

  /**
   * Assign a role to a user
   */
  async assignRole(request: AssignRoleRequest): Promise<Result<AssignRoleResponse>> {
    return this.assignRole.execute(request);
  }

  /**
   * Get users with filtering
   */
  async getUsers(request: GetUsersRequest): Promise<Result<GetUsersResponse>> {
    return this.getUsers.execute(request);
  }

  /**
   * Quick permission check (returns boolean)
   */
  async hasPermission(userId: string, permission: PermissionString): Promise<boolean> {
    const result = await this.checkPermission(userId, permission);
    return result.isSuccess() && result.value;
  }

  /**
   * Get user by ID (convenience method)
   */
  async getUserById(userId: string, requestedBy: string): Promise<Result<User | null>> {
    // Check if requesting user can view users
    const hasPermission = await this.hasPermission(requestedBy, 'users:view');
    if (!hasPermission) {
      return Result.failure('Insufficient permissions to view user');
    }

    const usersResult = await this.getUsers.execute({
      requestedBy,
      limit: 1,
      offset: 0
    });

    if (usersResult.isFailure()) {
      return Result.failure(usersResult.error);
    }

    const user = usersResult.value.users.find(u => u.id.value === userId);
    return Result.success(user || null);
  }

  /**
   * Create super admin user (initial setup)
   */
  async createSuperAdmin(email: string, clerkUserId?: string): Promise<Result<CreateUserResponse>> {
    return this.createUser.execute({
      email,
      role: UserRoleType.SUPER_ADMIN,
      clerkUserId,
      createExternalUser: false // Assume Clerk user already exists
    });
  }

  /**
   * Bulk role assignment
   */
  async bulkAssignRole(
    userIds: string[],
    newRole: UserRoleType,
    assignedBy: string
  ): Promise<Result<{ successful: string[]; failed: { userId: string; error: string }[] }>> {
    const successful: string[] = [];
    const failed: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      const result = await this.assignRole.execute({
        userId,
        newRole,
        assignedBy
      });

      if (result.isSuccess()) {
        successful.push(userId);
      } else {
        failed.push({ userId, error: result.error });
      }
    }

    return Result.success({ successful, failed });
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<Result<UserManagementHealth>> {
    try {
      // Test basic functionality
      const usersResult = await this.getUsers.execute({
        requestedBy: 'system', // Special system user for health checks
        limit: 1
      });

      const checks = {
        userRepository: usersResult.isSuccess(),
        authService: true, // Basic check
        permissionSystem: true // Basic check
      };

      const status = Object.values(checks).every(Boolean) ? 'healthy' : 'degraded';

      // Get user counts if possible
      let userCount = 0;
      let activeUserCount = 0;

      if (usersResult.isSuccess()) {
        userCount = usersResult.value.total;

        const activeUsersResult = await this.getUsers.execute({
          requestedBy: 'system',
          isActive: true,
          limit: 1000 // Get all active users for count
        });

        if (activeUsersResult.isSuccess()) {
          activeUserCount = activeUsersResult.value.users.length;
        }
      }

      return Result.success({
        status,
        checks,
        userCount,
        activeUserCount
      });
    } catch (error) {
      return Result.success({
        status: 'unhealthy',
        checks: {
          userRepository: false,
          authService: false,
          permissionSystem: false
        },
        userCount: 0,
        activeUserCount: 0
      });
    }
  }

  /**
   * Dry run mode check (for testing)
   */
  async dryRun(): Promise<Result<string>> {
    const health = await this.getHealth();

    if (health.isFailure()) {
      return Result.failure('User management module health check failed');
    }

    return Result.success(`User Management Module is ${health.value.status}. Users: ${health.value.userCount} (${health.value.activeUserCount} active)`);
  }
}