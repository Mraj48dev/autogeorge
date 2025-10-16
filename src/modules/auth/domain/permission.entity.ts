/**
 * Permission System - Enterprise Grade Authorization
 *
 * This implements a granular, resource-based permission system designed for
 * enterprise B2B SaaS applications. Each permission grants specific access
 * to resources and actions within the AutoGeorge platform.
 *
 * Architecture:
 * - Permissions are atomic (e.g., "articles:create", "users:delete")
 * - Resources map to business entities (articles, sources, users, etc.)
 * - Actions define what can be done (create, read, update, delete, manage)
 * - Roles aggregate permissions for easier management
 * - Users inherit permissions through their assigned roles
 *
 * Business Value:
 * - Fine-grained access control for enterprise security compliance
 * - Scalable permission model that grows with customer needs
 * - Audit-friendly with clear permission trails
 * - Self-service admin interface reduces support overhead
 */

import { ValueObject } from '@/shared/domain/ValueObject';

/**
 * Core resources available in the AutoGeorge platform
 * Each resource corresponds to a major business capability
 */
export enum Resource {
  // Content Management
  ARTICLES = 'articles',
  SOURCES = 'sources',
  FEEDS = 'feeds',

  // User & Access Management
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',

  // Publishing & Integration
  WORDPRESS_SITES = 'wordpress_sites',
  PUBLISHING = 'publishing',

  // AI & Content Generation
  AI_PROMPTS = 'ai_prompts',
  IMAGE_GENERATION = 'image_generation',

  // System Administration
  SYSTEM = 'system',
  ANALYTICS = 'analytics',
  BILLING = 'billing',
  AUDIT_LOGS = 'audit_logs'
}

/**
 * Available actions that can be performed on resources
 * Following CRUD + management pattern for comprehensive access control
 */
export enum Action {
  // Standard CRUD operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',

  // Advanced operations
  MANAGE = 'manage',      // Full administrative access
  PUBLISH = 'publish',    // Publish/deploy operations
  APPROVE = 'approve',    // Content approval workflows
  MODERATE = 'moderate',  // Content moderation capabilities

  // System operations
  EXPORT = 'export',      // Data export capabilities
  IMPORT = 'import',      // Data import capabilities
  CONFIGURE = 'configure' // Configuration management
}

/**
 * Permission Entity - Represents a single atomic permission
 *
 * Format: "resource:action" (e.g., "articles:create", "users:delete")
 * This atomic approach allows for maximum flexibility in permission assignment
 */
export class Permission extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Creates a permission from resource and action
   * @param resource The resource being accessed
   * @param action The action being performed
   * @returns Permission instance
   */
  static create(resource: Resource, action: Action): Permission {
    const permissionString = `${resource}:${action}`;
    return new Permission(permissionString);
  }

  /**
   * Creates a permission from a string representation
   * @param permissionString String in format "resource:action"
   * @returns Permission instance
   * @throws Error if format is invalid
   */
  static fromString(permissionString: string): Permission {
    if (!this.isValidPermissionString(permissionString)) {
      throw new Error(`Invalid permission format: ${permissionString}. Expected format: "resource:action"`);
    }
    return new Permission(permissionString);
  }

  /**
   * Validates permission string format
   */
  private static isValidPermissionString(value: string): boolean {
    const [resource, action] = value.split(':');
    return (
      Object.values(Resource).includes(resource as Resource) &&
      Object.values(Action).includes(action as Action)
    );
  }

  /**
   * Gets the resource part of the permission
   */
  get resource(): Resource {
    return this.value.split(':')[0] as Resource;
  }

  /**
   * Gets the action part of the permission
   */
  get action(): Action {
    return this.value.split(':')[1] as Action;
  }

  /**
   * Checks if this permission grants access to a specific resource/action combo
   */
  grantsAccess(resource: Resource, action: Action): boolean {
    // Exact match
    if (this.resource === resource && this.action === action) {
      return true;
    }

    // "manage" action grants all other actions on the same resource
    if (this.resource === resource && this.action === Action.MANAGE) {
      return true;
    }

    // System:manage grants access to everything (super admin)
    if (this.resource === Resource.SYSTEM && this.action === Action.MANAGE) {
      return true;
    }

    return false;
  }

  /**
   * Human-readable description of the permission
   */
  get description(): string {
    const resourceDescriptions = {
      [Resource.ARTICLES]: 'Articles & Content',
      [Resource.SOURCES]: 'Content Sources',
      [Resource.FEEDS]: 'RSS Feeds',
      [Resource.USERS]: 'User Management',
      [Resource.ROLES]: 'Role Management',
      [Resource.PERMISSIONS]: 'Permission Management',
      [Resource.WORDPRESS_SITES]: 'WordPress Sites',
      [Resource.PUBLISHING]: 'Content Publishing',
      [Resource.AI_PROMPTS]: 'AI Prompts',
      [Resource.IMAGE_GENERATION]: 'Image Generation',
      [Resource.SYSTEM]: 'System Administration',
      [Resource.ANALYTICS]: 'Analytics & Reporting',
      [Resource.BILLING]: 'Billing & Subscriptions',
      [Resource.AUDIT_LOGS]: 'Audit Logs'
    };

    const actionDescriptions = {
      [Action.CREATE]: 'Create',
      [Action.READ]: 'View',
      [Action.UPDATE]: 'Edit',
      [Action.DELETE]: 'Delete',
      [Action.MANAGE]: 'Full Management',
      [Action.PUBLISH]: 'Publish',
      [Action.APPROVE]: 'Approve',
      [Action.MODERATE]: 'Moderate',
      [Action.EXPORT]: 'Export',
      [Action.IMPORT]: 'Import',
      [Action.CONFIGURE]: 'Configure'
    };

    return `${actionDescriptions[this.action]} ${resourceDescriptions[this.resource]}`;
  }
}

/**
 * Predefined permission sets for common business scenarios
 * These provide a starting point for role configuration
 */
export class PermissionSets {
  /**
   * Content Editor permissions - can manage articles and sources
   */
  static get CONTENT_EDITOR(): Permission[] {
    return [
      Permission.create(Resource.ARTICLES, Action.CREATE),
      Permission.create(Resource.ARTICLES, Action.READ),
      Permission.create(Resource.ARTICLES, Action.UPDATE),
      Permission.create(Resource.SOURCES, Action.READ),
      Permission.create(Resource.FEEDS, Action.READ),
      Permission.create(Resource.AI_PROMPTS, Action.CREATE),
      Permission.create(Resource.AI_PROMPTS, Action.READ),
      Permission.create(Resource.IMAGE_GENERATION, Action.CREATE)
    ];
  }

  /**
   * Content Publisher permissions - can publish and manage publishing
   */
  static get CONTENT_PUBLISHER(): Permission[] {
    return [
      ...this.CONTENT_EDITOR,
      Permission.create(Resource.ARTICLES, Action.PUBLISH),
      Permission.create(Resource.PUBLISHING, Action.MANAGE),
      Permission.create(Resource.WORDPRESS_SITES, Action.READ),
      Permission.create(Resource.WORDPRESS_SITES, Action.CONFIGURE)
    ];
  }

  /**
   * Content Manager permissions - full content management capabilities
   */
  static get CONTENT_MANAGER(): Permission[] {
    return [
      ...this.CONTENT_PUBLISHER,
      Permission.create(Resource.ARTICLES, Action.DELETE),
      Permission.create(Resource.ARTICLES, Action.MODERATE),
      Permission.create(Resource.SOURCES, Action.MANAGE),
      Permission.create(Resource.FEEDS, Action.MANAGE),
      Permission.create(Resource.ANALYTICS, Action.READ)
    ];
  }

  /**
   * User Manager permissions - can manage users and roles
   */
  static get USER_MANAGER(): Permission[] {
    return [
      Permission.create(Resource.USERS, Action.READ),
      Permission.create(Resource.USERS, Action.UPDATE),
      Permission.create(Resource.ROLES, Action.READ),
      Permission.create(Resource.ROLES, Action.UPDATE),
      Permission.create(Resource.AUDIT_LOGS, Action.READ)
    ];
  }

  /**
   * System Administrator permissions - full system access
   */
  static get SYSTEM_ADMIN(): Permission[] {
    return [
      Permission.create(Resource.SYSTEM, Action.MANAGE),
      Permission.create(Resource.USERS, Action.MANAGE),
      Permission.create(Resource.ROLES, Action.MANAGE),
      Permission.create(Resource.PERMISSIONS, Action.MANAGE),
      Permission.create(Resource.BILLING, Action.MANAGE),
      Permission.create(Resource.AUDIT_LOGS, Action.MANAGE),
      Permission.create(Resource.ANALYTICS, Action.MANAGE)
    ];
  }

  /**
   * Read-only Viewer permissions - can view most content
   */
  static get VIEWER(): Permission[] {
    return [
      Permission.create(Resource.ARTICLES, Action.READ),
      Permission.create(Resource.SOURCES, Action.READ),
      Permission.create(Resource.FEEDS, Action.READ),
      Permission.create(Resource.ANALYTICS, Action.READ)
    ];
  }
}

/**
 * Permission validation and utility functions
 */
export class PermissionUtils {
  /**
   * Checks if a set of permissions includes a specific permission
   */
  static hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.some(permission =>
      permission.grantsAccess(requiredPermission.resource, requiredPermission.action)
    );
  }

  /**
   * Checks if a user has permission to perform an action on a resource
   */
  static canPerformAction(
    userPermissions: Permission[],
    resource: Resource,
    action: Action
  ): boolean {
    return userPermissions.some(permission => permission.grantsAccess(resource, action));
  }

  /**
   * Gets all unique resources a user has any permission for
   */
  static getAccessibleResources(userPermissions: Permission[]): Resource[] {
    const resources = userPermissions.map(p => p.resource);
    return [...new Set(resources)];
  }

  /**
   * Gets all permissions for a specific resource
   */
  static getResourcePermissions(userPermissions: Permission[], resource: Resource): Permission[] {
    return userPermissions.filter(p => p.resource === resource);
  }

  /**
   * Validates that a permission set is internally consistent
   */
  static validatePermissionSet(permissions: Permission[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicates
    const permissionStrings = permissions.map(p => p.toString());
    const uniquePermissions = new Set(permissionStrings);
    if (permissionStrings.length !== uniquePermissions.size) {
      errors.push('Duplicate permissions detected');
    }

    // Check for conflicting permissions (e.g., having both specific action and manage)
    const resourceActions = new Map<Resource, Set<Action>>();
    permissions.forEach(permission => {
      if (!resourceActions.has(permission.resource)) {
        resourceActions.set(permission.resource, new Set());
      }
      resourceActions.get(permission.resource)!.add(permission.action);
    });

    resourceActions.forEach((actions, resource) => {
      if (actions.has(Action.MANAGE) && actions.size > 1) {
        errors.push(`Resource ${resource} has both 'manage' and specific actions - 'manage' supersedes all others`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}