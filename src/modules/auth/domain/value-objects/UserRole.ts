import { ValueObject } from '../../../sources/shared/domain/base/ValueObject';

/**
 * User role value object
 * Defines user roles and their permissions
 */
export class UserRole extends ValueObject<string> {
  private static readonly VALID_ROLES = ['user', 'admin', 'super_admin'] as const;
  private static readonly ROLE_PERMISSIONS: Record<string, string[]> = {
    user: ['view_dashboard', 'generate_articles', 'manage_own_profile'],
    admin: [
      'view_dashboard',
      'generate_articles',
      'manage_own_profile',
      'manage_sources',
      'manage_articles',
      'manage_publishing',
      'view_analytics',
      'manage_settings'
    ],
    super_admin: [
      'view_dashboard',
      'generate_articles',
      'manage_own_profile',
      'manage_sources',
      'manage_articles',
      'manage_publishing',
      'view_analytics',
      'manage_settings',
      'manage_users',
      'manage_roles',
      'manage_system'
    ]
  };

  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Role cannot be empty');
    }

    const role = value.trim().toLowerCase();
    if (!UserRole.VALID_ROLES.includes(role as any)) {
      throw new Error(`Invalid role: ${role}. Valid roles are: ${UserRole.VALID_ROLES.join(', ')}`);
    }
  }

  getValue(): string {
    return super.getValue().trim().toLowerCase();
  }

  static user(): UserRole {
    return new UserRole('user');
  }

  static admin(): UserRole {
    return new UserRole('admin');
  }

  static superAdmin(): UserRole {
    return new UserRole('super_admin');
  }

  static fromString(value: string): UserRole {
    return new UserRole(value);
  }

  /**
   * Checks if this role is admin or higher
   */
  isAdmin(): boolean {
    const role = this.getValue();
    return role === 'admin' || role === 'super_admin';
  }

  /**
   * Checks if this role is super admin
   */
  isSuperAdmin(): boolean {
    return this.getValue() === 'super_admin';
  }

  /**
   * Checks if this role has a specific permission
   */
  hasPermission(permission: string): boolean {
    const role = this.getValue();
    const permissions = UserRole.ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Gets all permissions for this role
   */
  getPermissions(): string[] {
    const role = this.getValue();
    return UserRole.ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Checks if this role can transition to another role
   */
  canTransitionTo(targetRole: UserRole): boolean {
    const currentRole = this.getValue();
    const target = targetRole.getValue();

    // Super admin can transition to any role
    if (currentRole === 'super_admin') {
      return true;
    }

    // Admin can become user
    if (currentRole === 'admin' && target === 'user') {
      return true;
    }

    // User can become admin (requires super admin approval in business logic)
    if (currentRole === 'user' && target === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * Gets the role hierarchy level (higher number = more privileged)
   */
  getHierarchyLevel(): number {
    const role = this.getValue();
    switch (role) {
      case 'user':
        return 1;
      case 'admin':
        return 2;
      case 'super_admin':
        return 3;
      default:
        return 0;
    }
  }
}