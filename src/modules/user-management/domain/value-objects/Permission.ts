import { ValueObject } from '@/shared/domain/base/ValueObject';
import { Result } from '@/shared/domain/types/Result';

export interface PermissionProps {
  resource: string;
  action: string;
}

export class Permission extends ValueObject<PermissionProps> {
  get resource(): string {
    return this.props.resource;
  }

  get action(): string {
    return this.props.action;
  }

  get value(): string {
    return `${this.resource}:${this.action}`;
  }

  public static create(resource: string, action: string): Result<Permission> {
    if (!resource || !action) {
      return Result.failure('Resource and action are required');
    }

    if (resource.includes(':') || action.includes(':')) {
      return Result.failure('Resource and action cannot contain colons');
    }

    return Result.success(new Permission({ resource, action }));
  }

  public static fromString(permission: string): Result<Permission> {
    if (!permission || !permission.includes(':')) {
      return Result.failure('Permission must be in format "resource:action"');
    }

    const [resource, action] = permission.split(':');
    return Permission.create(resource, action);
  }

  public matches(permission: Permission): boolean {
    return this.value === permission.value;
  }

  public matchesString(permissionString: string): boolean {
    return this.value === permissionString;
  }
}

// Core permissions constants
export const PERMISSIONS = {
  // Articles
  ARTICLES_CREATE: 'articles:create',
  ARTICLES_EDIT: 'articles:edit',
  ARTICLES_DELETE: 'articles:delete',
  ARTICLES_PUBLISH: 'articles:publish',
  ARTICLES_APPROVE: 'articles:approve',
  ARTICLES_VIEW: 'articles:view',

  // Sources
  SOURCES_CREATE: 'sources:create',
  SOURCES_EDIT: 'sources:edit',
  SOURCES_DELETE: 'sources:delete',
  SOURCES_VIEW: 'sources:view',
  SOURCES_FETCH: 'sources:fetch',

  // WordPress
  WORDPRESS_CONFIGURE: 'wordpress:configure',
  WORDPRESS_PUBLISH: 'wordpress:publish',
  WORDPRESS_MANAGE_MEDIA: 'wordpress:manage_media',

  // Images
  IMAGES_GENERATE: 'images:generate',
  IMAGES_EDIT: 'images:edit',
  IMAGES_UPLOAD: 'images:upload',
  IMAGES_DELETE: 'images:delete',

  // Users (Admin only)
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_ASSIGN_ROLES: 'users:assign_roles',
  USERS_VIEW: 'users:view',

  // System (Super Admin only)
  SYSTEM_CONFIGURE: 'system:configure',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_DEBUG: 'system:debug',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // API
  API_ACCESS: 'api:access',
  API_WRITE: 'api:write',

  // Automation
  AUTOMATION_CONFIGURE: 'automation:configure',
  AUTOMATION_TRIGGER: 'automation:trigger',
  AUTOMATION_VIEW: 'automation:view',
} as const;

export type PermissionString = typeof PERMISSIONS[keyof typeof PERMISSIONS];