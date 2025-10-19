/**
 * User Context Service
 * Handles user context propagation throughout the application
 */
export interface UserContext {
  userId: string;
  userRole: UserRole;
  organizationId?: string;
  permissions: string[];
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  CONTENT_EDITOR = 'CONTENT_EDITOR',
  CONTENT_VIEWER = 'CONTENT_VIEWER',
  API_USER = 'API_USER'
}

export class UserContextService {

  /**
   * Creates user context from authentication data
   */
  static createContext(userData: {
    userId: string;
    role: UserRole;
    organizationId?: string;
    permissions?: string[];
  }): UserContext {
    return {
      userId: userData.userId,
      userRole: userData.role,
      organizationId: userData.organizationId,
      permissions: userData.permissions || []
    };
  }

  /**
   * Validates if user has required permission
   */
  static hasPermission(context: UserContext, permission: string): boolean {
    // Super admin has all permissions
    if (context.userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    return context.permissions.includes(permission);
  }

  /**
   * Validates if user can access resource
   */
  static canAccessResource(context: UserContext, resourceUserId?: string): boolean {
    // Super admin can access everything
    if (context.userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // User can only access their own resources
    return !resourceUserId || context.userId === resourceUserId;
  }

  /**
   * Creates system context for cron jobs and system operations
   */
  static createSystemContext(): UserContext {
    return {
      userId: 'system',
      userRole: UserRole.SUPER_ADMIN,
      permissions: ['*']
    };
  }
}