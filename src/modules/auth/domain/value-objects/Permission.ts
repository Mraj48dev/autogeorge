import { StringValueObject } from '@/shared/domain/base/ValueObject';

/**
 * System permissions organized by domain
 */
export enum SystemPermission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',

  // Site management
  SITE_CREATE = 'site:create',
  SITE_READ = 'site:read',
  SITE_UPDATE = 'site:update',
  SITE_DELETE = 'site:delete',
  SITE_LIST = 'site:list',

  // Source management
  SOURCE_CREATE = 'source:create',
  SOURCE_READ = 'source:read',
  SOURCE_UPDATE = 'source:update',
  SOURCE_DELETE = 'source:delete',
  SOURCE_LIST = 'source:list',
  SOURCE_FETCH = 'source:fetch',

  // Content management
  CONTENT_CREATE = 'content:create',
  CONTENT_READ = 'content:read',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  CONTENT_LIST = 'content:list',
  CONTENT_GENERATE = 'content:generate',

  // Publishing
  PUBLISH_CREATE = 'publish:create',
  PUBLISH_READ = 'publish:read',
  PUBLISH_UPDATE = 'publish:update',
  PUBLISH_DELETE = 'publish:delete',
  PUBLISH_LIST = 'publish:list',

  // Image management
  IMAGE_CREATE = 'image:create',
  IMAGE_READ = 'image:read',
  IMAGE_UPDATE = 'image:update',
  IMAGE_DELETE = 'image:delete',
  IMAGE_LIST = 'image:list',
  IMAGE_GENERATE = 'image:generate',

  // Automation
  AUTOMATION_CREATE = 'automation:create',
  AUTOMATION_READ = 'automation:read',
  AUTOMATION_UPDATE = 'automation:update',
  AUTOMATION_DELETE = 'automation:delete',
  AUTOMATION_LIST = 'automation:list',
  AUTOMATION_EXECUTE = 'automation:execute',

  // Billing
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_CONSUME = 'billing:consume',

  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_CONFIG = 'system:config',
}

/**
 * Permission Value Object
 * Represents a specific permission that can be granted to users or roles
 */
export class Permission extends StringValueObject {
  private static readonly VALID_PERMISSIONS = Object.values(SystemPermission);
  private static readonly PERMISSION_PATTERN = /^[a-z_]+:[a-z_]+$/;
  private static readonly MAX_LENGTH = 100;

  protected validate(value: string): void {
    this.validateNotEmpty(value);

    // Check max length on the input value, not this.value
    if (value.length > Permission.MAX_LENGTH) {
      throw new Error(`Permission cannot exceed ${Permission.MAX_LENGTH} characters`);
    }

    const normalizedValue = value.toLowerCase();

    // Check if it's a system permission or follows the correct pattern
    if (!this.isValidPermission(normalizedValue)) {
      throw new Error(
        `Invalid permission: ${value}. Must follow pattern 'domain:action' (e.g., 'user:read')`
      );
    }
  }

  private isValidPermission(value: string): boolean {
    // Check if it's a predefined system permission
    if (Permission.VALID_PERMISSIONS.includes(value as SystemPermission)) {
      return true;
    }

    // Check if it follows the domain:action pattern
    return Permission.PERMISSION_PATTERN.test(value);
  }

  /**
   * Creates a Permission from a string value
   */
  static create(value: string): Permission {
    return new Permission(value.toLowerCase().trim());
  }

  /**
   * Creates a permission from domain and action
   */
  static fromDomainAction(domain: string, action: string): Permission {
    return new Permission(`${domain.toLowerCase()}:${action.toLowerCase()}`);
  }

  /**
   * Returns the domain part of the permission (before :)
   */
  getDomain(): string {
    return this.value.split(':')[0];
  }

  /**
   * Returns the action part of the permission (after :)
   */
  getAction(): string {
    return this.value.split(':')[1];
  }

  /**
   * Checks if this permission applies to a specific domain
   */
  appliesToDomain(domain: string): boolean {
    return this.getDomain() === domain.toLowerCase();
  }

  /**
   * Checks if this is a read permission
   */
  isReadPermission(): boolean {
    return this.getAction() === 'read' || this.getAction() === 'list';
  }

  /**
   * Checks if this is a write permission
   */
  isWritePermission(): boolean {
    const writeActions = ['create', 'update', 'delete'];
    return writeActions.includes(this.getAction());
  }

  /**
   * Checks if this is an admin permission
   */
  isAdminPermission(): boolean {
    return this.value === SystemPermission.SYSTEM_ADMIN ||
           this.getDomain() === 'system';
  }

  /**
   * Checks if this permission implies another permission
   * (e.g., system:admin implies all permissions)
   */
  implies(other: Permission): boolean {
    // System admin implies all permissions
    if (this.value === SystemPermission.SYSTEM_ADMIN) {
      return true;
    }

    // Same permission
    if (this.equals(other)) {
      return true;
    }

    // Domain admin implies all actions in that domain
    if (this.getAction() === 'admin' && this.getDomain() === other.getDomain()) {
      return true;
    }

    return false;
  }

  /**
   * Creates all CRUD permissions for a domain
   */
  static createCrudPermissions(domain: string): Permission[] {
    return [
      Permission.fromDomainAction(domain, 'create'),
      Permission.fromDomainAction(domain, 'read'),
      Permission.fromDomainAction(domain, 'update'),
      Permission.fromDomainAction(domain, 'delete'),
      Permission.fromDomainAction(domain, 'list'),
    ];
  }
}