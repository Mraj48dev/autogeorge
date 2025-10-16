import { Entity } from '@/shared/domain/base/Entity';
import { Result } from '@/shared/domain/types/Result';
import { UserId } from '../value-objects/UserId';
import { UserRole, UserRoleType } from '../value-objects/UserRole';
import { Permission, PermissionString } from '../value-objects/Permission';

export interface UserProps {
  id: UserId;
  email: string;
  clerkUserId?: string;
  role: UserRole;
  organizationId?: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class User extends Entity<UserProps> {
  get id(): UserId {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get clerkUserId(): string | undefined {
    return this.props.clerkUserId;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get organizationId(): string | undefined {
    return this.props.organizationId;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get permissions(): string[] {
    return this.props.permissions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  public static create(props: {
    email: string;
    clerkUserId?: string;
    role?: UserRoleType;
    organizationId?: string;
    permissions?: string[];
  }): Result<User> {
    // Validate email
    if (!props.email || !props.email.includes('@')) {
      return Result.failure('Valid email is required');
    }

    // Create role
    const roleResult = UserRole.create(props.role || UserRoleType.CONTENT_VIEWER);
    if (roleResult.isFailure()) {
      return Result.failure(`Invalid role: ${roleResult.error}`);
    }

    const id = UserId.generate();
    const now = new Date();

    const user = new User({
      id,
      email: props.email,
      clerkUserId: props.clerkUserId,
      role: roleResult.value,
      organizationId: props.organizationId,
      isActive: true,
      permissions: props.permissions || [],
      createdAt: now,
      updatedAt: now
    });

    return Result.success(user);
  }

  public hasPermission(permission: PermissionString): boolean {
    // Super admin has all permissions
    if (this.role.isSuperAdmin()) {
      return true;
    }

    // Check explicit permissions
    if (this.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    return this.getRolePermissions().includes(permission);
  }

  public canManageUser(otherUser: User): boolean {
    // Cannot manage yourself through this method
    if (this.id.value === otherUser.id.value) {
      return false;
    }

    // Super admin can manage everyone
    if (this.role.isSuperAdmin()) {
      return true;
    }

    // Organization admin can manage users in same organization
    if (this.role.isOrganizationAdmin() &&
        this.organizationId === otherUser.organizationId) {
      return this.role.canManageRole(otherUser.role);
    }

    return false;
  }

  public updateRole(newRole: UserRole): Result<User> {
    if (!newRole) {
      return Result.failure('Role is required');
    }

    const updatedUser = new User({
      ...this.props,
      role: newRole,
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  public activate(): Result<User> {
    if (this.isActive) {
      return Result.failure('User is already active');
    }

    const updatedUser = new User({
      ...this.props,
      isActive: true,
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  public deactivate(): Result<User> {
    if (!this.isActive) {
      return Result.failure('User is already inactive');
    }

    const updatedUser = new User({
      ...this.props,
      isActive: false,
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  public addPermission(permission: PermissionString): Result<User> {
    if (this.permissions.includes(permission)) {
      return Result.failure('User already has this permission');
    }

    const updatedPermissions = [...this.permissions, permission];
    const updatedUser = new User({
      ...this.props,
      permissions: updatedPermissions,
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  public removePermission(permission: PermissionString): Result<User> {
    if (!this.permissions.includes(permission)) {
      return Result.failure('User does not have this permission');
    }

    const updatedPermissions = this.permissions.filter(p => p !== permission);
    const updatedUser = new User({
      ...this.props,
      permissions: updatedPermissions,
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  public recordLogin(): Result<User> {
    const updatedUser = new User({
      ...this.props,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });

    return Result.success(updatedUser);
  }

  private getRolePermissions(): string[] {
    const roleType = this.role.value;

    switch (roleType) {
      case UserRoleType.SUPER_ADMIN:
        return []; // Super admin gets all permissions via hasPermission check

      case UserRoleType.ORGANIZATION_ADMIN:
        return [
          'admin:access',
          'content:view', 'content:create', 'content:edit', 'content:publish', 'content:delete',
          'sources:view', 'sources:manage',
          'users:view', 'users:manage',
          'organization:view', 'organization:manage',
          'api:access'
        ];

      case UserRoleType.CONTENT_MANAGER:
        return [
          'content:view', 'content:create', 'content:edit', 'content:publish',
          'sources:view', 'sources:manage'
        ];

      case UserRoleType.CONTENT_EDITOR:
        return [
          'content:view', 'content:edit',
          'sources:view'
        ];

      case UserRoleType.CONTENT_VIEWER:
        return [
          'content:view',
          'sources:view'
        ];

      case UserRoleType.API_USER:
        return [
          'api:access',
          'content:view',
          'sources:view'
        ];

      default:
        return [];
    }
  }
}