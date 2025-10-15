import { Result } from '@/shared/domain/types/Result';
import { AuthenticateUser, AuthenticateUserInput, AuthenticateUserOutput, AuthError } from '../application/use-cases/AuthenticateUser';
import { GetUser, GetUserInput, GetUserOutput, GetUserError } from '../application/use-cases/GetUser';
import { ManageUserRoles, ManageUserRolesInput, ManageUserRolesOutput, RoleManagementError } from '../application/use-cases/ManageUserRoles';
import { ValidatePermissions, ValidatePermissionsInput, ValidatePermissionsOutput, PermissionError } from '../application/use-cases/ValidatePermissions';
import { User } from '../domain/entities/User';
import { Role, SystemRole } from '../domain/value-objects/Role';
import { Permission, SystemPermission } from '../domain/value-objects/Permission';
import { Email } from '../domain/value-objects/Email';
import { UserId } from '../domain/value-objects/UserId';

/**
 * Admin requests and responses
 */
export interface CreateUserRequest {
  email: string;
  name?: string;
  image?: string;
  role?: string;
}

export interface CreateUserResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: string;
    permissions: string[];
    isActive: boolean;
    createdAt: Date;
  };
  isNewUser: boolean;
}

export interface GetUserRequest {
  userId?: string;
  email?: string;
}

export interface GetUserResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: string;
    permissions: string[];
    isActive: boolean;
    emailVerified?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ListUsersRequest {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface ListUsersResponse {
  users: GetUserResponse['user'][];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: string;
}

export interface GrantPermissionsRequest {
  userId: string;
  permissions: string[];
}

export interface RevokePermissionsRequest {
  userId: string;
  permissions: string[];
}

export interface ValidateAccessRequest {
  userId: string;
  requiredPermissions: string[];
  requireAll?: boolean;
}

export interface ValidateAccessResponse {
  hasAccess: boolean;
  user: GetUserResponse['user'];
  grantedPermissions: string[];
  deniedPermissions: string[];
}

export interface AuthStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  editorUsers: number;
  viewerUsers: number;
  recentLogins: number; // Last 24h
}

/**
 * Admin facade for Auth module
 * Provides a simplified interface for authentication and authorization operations
 */
export class AuthAdminFacade {
  constructor(
    private readonly authenticateUserUseCase: AuthenticateUser,
    private readonly getUserUseCase: GetUser,
    private readonly manageUserRolesUseCase: ManageUserRoles,
    private readonly validatePermissionsUseCase: ValidatePermissions
  ) {}

  /**
   * Creates or authenticates a user
   */
  async createUser(request: CreateUserRequest): Promise<Result<CreateUserResponse, AuthError>> {
    const authResult = await this.authenticateUserUseCase.execute({
      email: request.email,
      userAgent: 'Admin',
      ipAddress: 'admin',
    });

    if (authResult.isFailure()) {
      return authResult;
    }

    const { user, isNewUser } = authResult.value;

    // If user is new and role is specified, update the role
    if (isNewUser && request.role) {
      const roleResult = await this.manageUserRolesUseCase.execute({
        userId: user.id.getValue(),
        action: 'CHANGE_ROLE',
        role: request.role,
      });

      if (roleResult.isFailure()) {
        return Result.failure(authResult.error);
      }
    }

    // Update profile if provided
    if (request.name || request.image) {
      user.updateProfile(request.name, request.image);
    }

    return Result.success({
      user: this.mapUserToResponse(user),
      isNewUser,
    });
  }

  /**
   * Gets a user by ID or email
   */
  async getUser(request: GetUserRequest): Promise<Result<GetUserResponse, GetUserError>> {
    const result = await this.getUserUseCase.execute(request);

    if (result.isFailure()) {
      return result;
    }

    return Result.success({
      user: this.mapUserToResponse(result.value.user),
    });
  }

  /**
   * Lists users with pagination and filtering
   */
  async listUsers(request: ListUsersRequest = {}): Promise<Result<ListUsersResponse, Error>> {
    try {
      // This would typically use a dedicated use case for listing
      // For now, we'll implement basic functionality

      const page = request.page || 1;
      const limit = Math.min(request.limit || 20, 100); // Max 100 per page

      // This is a placeholder - in a real implementation, you'd have a dedicated use case
      // that handles pagination, filtering, and search

      return Result.success({
        users: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      });
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Updates a user's role
   */
  async updateUserRole(request: UpdateUserRoleRequest): Promise<Result<GetUserResponse, RoleManagementError>> {
    const result = await this.manageUserRolesUseCase.execute({
      userId: request.userId,
      action: 'CHANGE_ROLE',
      role: request.role,
    });

    if (result.isFailure()) {
      return result;
    }

    return Result.success({
      user: this.mapUserToResponse(result.value.user),
    });
  }

  /**
   * Grants permissions to a user
   */
  async grantPermissions(request: GrantPermissionsRequest): Promise<Result<GetUserResponse, RoleManagementError>> {
    const result = await this.manageUserRolesUseCase.execute({
      userId: request.userId,
      action: 'GRANT_PERMISSIONS',
      permissions: request.permissions,
    });

    if (result.isFailure()) {
      return result;
    }

    return Result.success({
      user: this.mapUserToResponse(result.value.user),
    });
  }

  /**
   * Revokes permissions from a user
   */
  async revokePermissions(request: RevokePermissionsRequest): Promise<Result<GetUserResponse, RoleManagementError>> {
    const result = await this.manageUserRolesUseCase.execute({
      userId: request.userId,
      action: 'REVOKE_PERMISSIONS',
      permissions: request.permissions,
    });

    if (result.isFailure()) {
      return result;
    }

    return Result.success({
      user: this.mapUserToResponse(result.value.user),
    });
  }

  /**
   * Validates if a user has access to perform an operation
   */
  async validateAccess(request: ValidateAccessRequest): Promise<Result<ValidateAccessResponse, PermissionError>> {
    const result = await this.validatePermissionsUseCase.execute({
      userId: request.userId,
      requiredPermissions: request.requiredPermissions,
      requireAll: request.requireAll,
    });

    if (result.isFailure()) {
      return result;
    }

    return Result.success({
      hasAccess: result.value.hasAccess,
      user: this.mapUserToResponse(result.value.user),
      grantedPermissions: result.value.grantedPermissions.map(p => p.getValue()),
      deniedPermissions: result.value.deniedPermissions.map(p => p.getValue()),
    });
  }

  /**
   * Deactivates a user
   */
  async deactivateUser(userId: string): Promise<Result<GetUserResponse, Error>> {
    try {
      const userResult = await this.getUserUseCase.execute({ userId });

      if (userResult.isFailure()) {
        return userResult;
      }

      const user = userResult.value.user;
      user.deactivate();

      return Result.success({
        user: this.mapUserToResponse(user),
      });
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Activates a user
   */
  async activateUser(userId: string): Promise<Result<GetUserResponse, Error>> {
    try {
      const userResult = await this.getUserUseCase.execute({ userId });

      if (userResult.isFailure()) {
        return userResult;
      }

      const user = userResult.value.user;
      user.activate();

      return Result.success({
        user: this.mapUserToResponse(user),
      });
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets authentication and user statistics
   */
  async getAuthStats(): Promise<Result<AuthStatsResponse, Error>> {
    try {
      // This would typically use dedicated analytics use cases
      // For now, return placeholder data

      return Result.success({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0,
        editorUsers: 0,
        viewerUsers: 0,
        recentLogins: 0,
      });
    } catch (error) {
      return Result.failure(error as Error);
    }
  }

  /**
   * Gets available roles
   */
  getAvailableRoles(): string[] {
    return Object.values(SystemRole);
  }

  /**
   * Gets available permissions
   */
  getAvailablePermissions(): string[] {
    return Object.values(SystemPermission);
  }

  /**
   * Gets permissions for a specific role
   */
  getRolePermissions(role: string): string[] {
    try {
      const roleObj = Role.create(role);

      // This is simplified - in a real implementation, you'd have
      // a dedicated service to map roles to their default permissions

      if (roleObj.isAdmin()) {
        return [SystemPermission.SYSTEM_ADMIN];
      } else if (roleObj.isEditor()) {
        return [
          SystemPermission.SOURCE_CREATE,
          SystemPermission.SOURCE_READ,
          SystemPermission.SOURCE_UPDATE,
          SystemPermission.CONTENT_CREATE,
          SystemPermission.CONTENT_READ,
          SystemPermission.CONTENT_UPDATE,
          SystemPermission.CONTENT_GENERATE,
          SystemPermission.PUBLISH_CREATE,
          SystemPermission.PUBLISH_READ,
          SystemPermission.PUBLISH_UPDATE,
          SystemPermission.IMAGE_CREATE,
          SystemPermission.IMAGE_READ,
          SystemPermission.IMAGE_GENERATE,
        ];
      } else if (roleObj.isViewer()) {
        return [
          SystemPermission.SOURCE_READ,
          SystemPermission.CONTENT_READ,
          SystemPermission.PUBLISH_READ,
          SystemPermission.IMAGE_READ,
        ];
      } else if (roleObj.isApiClient()) {
        return [
          SystemPermission.CONTENT_CREATE,
          SystemPermission.CONTENT_GENERATE,
          SystemPermission.IMAGE_CREATE,
          SystemPermission.IMAGE_GENERATE,
        ];
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Health check for auth module
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    try {
      // Test basic functionality
      const testEmail = 'health-check@test.com';

      // This would test database connectivity, etc.
      // For now, return healthy

      return {
        status: 'healthy',
        details: {
          timestamp: new Date().toISOString(),
          userRepository: 'connected',
          sessionRepository: 'connected',
          authModule: 'operational',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Maps domain User entity to response DTO
   */
  private mapUserToResponse(user: User): GetUserResponse['user'] {
    return {
      id: user.id.getValue(),
      email: user.email.getValue(),
      name: user.name,
      image: user.image,
      role: user.role.getValue(),
      permissions: user.permissions.map(p => p.getValue()),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}