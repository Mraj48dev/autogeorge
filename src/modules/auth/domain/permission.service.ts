/**
 * Permission Service Interface - Enterprise Authorization Core
 *
 * This service provides the main interface for permission checking and management
 * throughout the AutoGeorge platform. It integrates with the Clean Architecture
 * pattern and Dependency Injection container for maximum testability and flexibility.
 *
 * Key Features:
 * - Runtime permission checking for real-time authorization
 * - Role-based permission aggregation
 * - Caching for performance in high-traffic scenarios
 * - Audit trail integration for compliance requirements
 * - Contextual permissions (resource-specific access)
 *
 * Business Value:
 * - Enables fine-grained access control for enterprise customers
 * - Reduces security incidents through comprehensive authorization
 * - Supports compliance with SOC2, ISO27001, and other standards
 * - Enables self-service permission management reducing support costs
 */

import { Permission, Resource, Action } from './permission.entity';
import { UserRole } from './user.entity';

/**
 * Permission check result with detailed context
 * Useful for debugging and audit trails
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  matchingPermissions?: Permission[];
  checkedAt: Date;
  userId: string;
  resource: Resource;
  action: Action;
}

/**
 * Context for permission checks
 * Allows for resource-specific authorization decisions
 */
export interface PermissionContext {
  userId: string;
  resourceId?: string;
  organizationId?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Role definition with associated permissions
 * Supports dynamic role configuration through admin interface
 */
export interface RoleDefinition {
  role: UserRole;
  permissions: Permission[];
  description: string;
  isSystemRole: boolean; // Built-in roles that cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main Permission Service Interface
 *
 * This interface defines all permission-related operations.
 * Multiple implementations are possible (database-backed, cache-backed, etc.)
 * following the Clean Architecture pattern.
 */
export interface PermissionService {
  /**
   * Checks if a user has a specific permission
   * This is the core authorization method used throughout the application
   *
   * @param userId The user ID to check permissions for
   * @param resource The resource being accessed
   * @param action The action being performed
   * @param context Optional context for resource-specific checks
   * @returns Detailed permission check result
   */
  checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    context?: PermissionContext
  ): Promise<PermissionCheckResult>;

  /**
   * Gets all permissions for a user (aggregated from their roles)
   * Used for UI rendering and batch permission checks
   *
   * @param userId The user ID
   * @returns Array of all user permissions
   */
  getUserPermissions(userId: string): Promise<Permission[]>;

  /**
   * Gets permissions for a specific role
   * Used in role management interfaces
   *
   * @param role The role to get permissions for
   * @returns Array of role permissions
   */
  getRolePermissions(role: UserRole): Promise<Permission[]>;

  /**
   * Updates permissions for a specific role
   * Core admin functionality for permission management
   *
   * @param role The role to update
   * @param permissions New set of permissions
   * @param updatedBy User ID of the admin making the change
   * @returns Success status
   */
  updateRolePermissions(
    role: UserRole,
    permissions: Permission[],
    updatedBy: string
  ): Promise<{ success: boolean; errors?: string[] }>;

  /**
   * Creates a new custom role with specified permissions
   * Enables dynamic role creation for enterprise customers
   *
   * @param roleData Role definition
   * @param createdBy User ID of the admin creating the role
   * @returns Created role definition
   */
  createRole(
    roleData: Omit<RoleDefinition, 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<RoleDefinition>;

  /**
   * Gets all available roles and their permissions
   * Used in admin interfaces for role management
   *
   * @returns Array of all role definitions
   */
  getAllRoles(): Promise<RoleDefinition[]>;

  /**
   * Validates a permission set for consistency
   * Ensures no conflicting or redundant permissions
   *
   * @param permissions Permissions to validate
   * @returns Validation result
   */
  validatePermissions(permissions: Permission[]): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Gets audit trail for permission changes
   * Required for compliance and security monitoring
   *
   * @param filters Optional filters for audit query
   * @returns Array of audit events
   */
  getPermissionAuditTrail(filters?: {
    userId?: string;
    role?: UserRole;
    resource?: Resource;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<PermissionAuditEvent[]>;

  /**
   * Bulk permission check for performance optimization
   * Useful for UI components that need to check multiple permissions
   *
   * @param userId User ID
   * @param checks Array of resource/action combinations to check
   * @returns Map of check results
   */
  bulkCheckPermissions(
    userId: string,
    checks: Array<{ resource: Resource; action: Action }>
  ): Promise<Map<string, boolean>>;

  /**
   * Clears permission cache for a user (if caching is enabled)
   * Used when user roles change
   *
   * @param userId User ID to clear cache for
   */
  clearUserPermissionCache(userId: string): Promise<void>;
}

/**
 * Audit event for permission changes
 * Maintains complete trail of all authorization-related changes
 */
export interface PermissionAuditEvent {
  id: string;
  eventType: 'PERMISSION_CHECK' | 'ROLE_UPDATED' | 'PERMISSION_GRANTED' | 'PERMISSION_DENIED' | 'ROLE_CREATED' | 'ROLE_DELETED';
  userId: string;
  targetUserId?: string; // For admin actions affecting other users
  role?: UserRole;
  resource?: Resource;
  action?: Action;
  granted: boolean;
  reason: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  sessionId: string;
  additionalData?: Record<string, any>;
}

/**
 * Permission Service Errors
 * Comprehensive error handling for authorization operations
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class InsufficientPermissionsError extends PermissionError {
  constructor(
    resource: Resource,
    action: Action,
    userId: string,
    context?: Record<string, any>
  ) {
    super(
      `User ${userId} does not have permission to ${action} ${resource}`,
      'INSUFFICIENT_PERMISSIONS',
      { resource, action, userId, ...context }
    );
  }
}

export class RoleNotFoundError extends PermissionError {
  constructor(role: UserRole) {
    super(`Role ${role} not found`, 'ROLE_NOT_FOUND', { role });
  }
}

export class PermissionValidationError extends PermissionError {
  constructor(errors: string[]) {
    super(`Permission validation failed: ${errors.join(', ')}`, 'VALIDATION_ERROR', { errors });
  }
}

/**
 * Permission decorators for method-level authorization
 * These decorators can be applied to use case methods for automatic permission checking
 */

/**
 * Decorator factory for requiring specific permissions
 * @param resource Required resource
 * @param action Required action
 */
export function RequirePermission(resource: Resource, action: Action) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract user context from arguments or dependency injection
      const userContext = this.getUserContext ? this.getUserContext() : args[0];

      if (!userContext?.userId) {
        throw new PermissionError('User context required for permission check', 'MISSING_USER_CONTEXT');
      }

      const permissionService: PermissionService = this.permissionService || this.container?.permissionService;

      if (!permissionService) {
        throw new PermissionError('Permission service not available', 'MISSING_PERMISSION_SERVICE');
      }

      const result = await permissionService.checkPermission(
        userContext.userId,
        resource,
        action,
        userContext
      );

      if (!result.granted) {
        throw new InsufficientPermissionsError(resource, action, userContext.userId, {
          reason: result.reason
        });
      }

      // Call original method if permission check passes
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utility functions for common permission patterns
 */
export class PermissionHelpers {
  /**
   * Checks if a user can manage another user (hierarchy check)
   * Prevents privilege escalation
   */
  static canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.EDITOR]: 1,
      [UserRole.ADMIN]: 2
    };

    return roleHierarchy[managerRole] > roleHierarchy[targetRole];
  }

  /**
   * Gets the maximum role that a user can assign to others
   */
  static getMaxAssignableRole(userRole: UserRole): UserRole {
    switch (userRole) {
      case UserRole.ADMIN:
        return UserRole.EDITOR; // Admins can assign up to Editor
      case UserRole.EDITOR:
        return UserRole.VIEWER; // Editors can assign up to Viewer
      default:
        throw new Error('User does not have permission to assign roles');
    }
  }

  /**
   * Formats permission for display in UI
   */
  static formatPermissionForDisplay(permission: Permission): string {
    return permission.description;
  }

  /**
   * Groups permissions by resource for UI organization
   */
  static groupPermissionsByResource(permissions: Permission[]): Map<Resource, Permission[]> {
    const grouped = new Map<Resource, Permission[]>();

    permissions.forEach(permission => {
      if (!grouped.has(permission.resource)) {
        grouped.set(permission.resource, []);
      }
      grouped.get(permission.resource)!.push(permission);
    });

    return grouped;
  }
}