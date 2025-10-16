import { ValueObject } from '@/shared/domain/base/ValueObject';
import { Result } from '@/shared/domain/types/Result';

export enum UserRoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  CONTENT_EDITOR = 'CONTENT_EDITOR',
  CONTENT_VIEWER = 'CONTENT_VIEWER',
  API_USER = 'API_USER'
}

export interface UserRoleProps {
  value: UserRoleType;
}

export class UserRole extends ValueObject<UserRoleProps> {
  get value(): UserRoleType {
    return this.props.value;
  }

  public static create(role: string): Result<UserRole> {
    if (!role) {
      return Result.failure('Role cannot be empty');
    }

    const normalizedRole = role.toUpperCase() as UserRoleType;

    if (!Object.values(UserRoleType).includes(normalizedRole)) {
      return Result.failure(`Invalid role: ${role}`);
    }

    return Result.success(new UserRole({ value: normalizedRole }));
  }

  public static superAdmin(): UserRole {
    return new UserRole({ value: UserRoleType.SUPER_ADMIN });
  }

  public static contentManager(): UserRole {
    return new UserRole({ value: UserRoleType.CONTENT_MANAGER });
  }

  public static contentViewer(): UserRole {
    return new UserRole({ value: UserRoleType.CONTENT_VIEWER });
  }

  public isSuperAdmin(): boolean {
    return this.value === UserRoleType.SUPER_ADMIN;
  }

  public isOrganizationAdmin(): boolean {
    return this.value === UserRoleType.ORGANIZATION_ADMIN;
  }

  public canManageUsers(): boolean {
    return this.isSuperAdmin() || this.isOrganizationAdmin();
  }

  public canManageContent(): boolean {
    return [
      UserRoleType.SUPER_ADMIN,
      UserRoleType.ORGANIZATION_ADMIN,
      UserRoleType.CONTENT_MANAGER,
      UserRoleType.CONTENT_EDITOR
    ].includes(this.value);
  }

  public canViewContent(): boolean {
    return Object.values(UserRoleType).includes(this.value);
  }

  public canManageSources(): boolean {
    return [
      UserRoleType.SUPER_ADMIN,
      UserRoleType.ORGANIZATION_ADMIN,
      UserRoleType.CONTENT_MANAGER
    ].includes(this.value);
  }

  public canViewSources(): boolean {
    return [
      UserRoleType.SUPER_ADMIN,
      UserRoleType.ORGANIZATION_ADMIN,
      UserRoleType.CONTENT_MANAGER,
      UserRoleType.CONTENT_EDITOR,
      UserRoleType.CONTENT_VIEWER
    ].includes(this.value);
  }

  public getHierarchyLevel(): number {
    const hierarchy = {
      [UserRoleType.SUPER_ADMIN]: 100,
      [UserRoleType.ORGANIZATION_ADMIN]: 80,
      [UserRoleType.CONTENT_MANAGER]: 60,
      [UserRoleType.CONTENT_EDITOR]: 40,
      [UserRoleType.CONTENT_VIEWER]: 20,
      [UserRoleType.API_USER]: 10
    };

    return hierarchy[this.value];
  }

  public canManageRole(otherRole: UserRole): boolean {
    return this.getHierarchyLevel() > otherRole.getHierarchyLevel();
  }
}