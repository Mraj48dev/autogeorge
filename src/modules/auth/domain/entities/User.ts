import { AggregateRoot } from '@/shared/domain/base/Entity';
import { UserId } from '../value-objects/UserId';
import { Email } from '../value-objects/Email';
import { Role } from '../value-objects/Role';
import { Permission } from '../value-objects/Permission';
import { UserCreatedEvent } from '../events/UserCreatedEvent';
import { UserRoleChangedEvent } from '../events/UserRoleChangedEvent';
import { UserDeactivatedEvent } from '../events/UserDeactivatedEvent';

export interface UserProps {
  id: UserId;
  email: Email;
  name?: string;
  image?: string;
  role: Role;
  permissions: Permission[];
  isActive: boolean;
  emailVerified?: Date;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Aggregate Root
 * Represents a user in the system with authentication and authorization capabilities
 */
export class User extends AggregateRoot<UserId> {
  private _email: Email;
  private _name?: string;
  private _image?: string;
  private _role: Role;
  private _permissions: Permission[];
  private _isActive: boolean;
  private _emailVerified?: Date;
  private _lastLoginAt?: Date;

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);

    this._email = props.email;
    this._name = props.name;
    this._image = props.image;
    this._role = props.role;
    this._permissions = [...props.permissions];
    this._isActive = props.isActive;
    this._emailVerified = props.emailVerified;
    this._lastLoginAt = props.lastLoginAt;

    this.validateInvariants();
  }

  /**
   * Creates a new User
   */
  static create(props: {
    email: Email;
    name?: string;
    image?: string;
    role?: Role;
  }): User {
    const userId = UserId.generate();
    const role = props.role || Role.viewer();
    const permissions = this.getDefaultPermissionsForRole(role);

    const user = new User({
      id: userId,
      email: props.email,
      name: props.name,
      image: props.image,
      role,
      permissions,
      isActive: true,
    });

    // Add domain event
    user.addDomainEvent(new UserCreatedEvent(userId, props.email, role));

    return user;
  }

  /**
   * Creates a User from existing data (e.g., from database)
   */
  static fromData(props: UserProps): User {
    return new User(props);
  }

  // Getters
  get email(): Email {
    return this._email;
  }

  get name(): string | undefined {
    return this._name;
  }

  get image(): string | undefined {
    return this._image;
  }

  get role(): Role {
    return this._role;
  }

  get permissions(): Permission[] {
    return [...this._permissions];
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get emailVerified(): Date | undefined {
    return this._emailVerified;
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  // Business methods

  /**
   * Updates user profile information
   */
  updateProfile(name?: string, image?: string): void {
    this._name = name;
    this._image = image;
    this.markAsUpdated();
  }

  /**
   * Changes the user's role
   */
  changeRole(newRole: Role): void {
    if (this._role.equals(newRole)) {
      return;
    }

    const oldRole = this._role;
    this._role = newRole;
    this._permissions = User.getDefaultPermissionsForRole(newRole);
    this.markAsUpdated();

    this.addDomainEvent(new UserRoleChangedEvent(this.id, oldRole, newRole));
  }

  /**
   * Grants additional permissions to the user
   */
  grantPermissions(permissions: Permission[]): void {
    const newPermissions = permissions.filter(
      perm => !this._permissions.some(existing => existing.equals(perm))
    );

    if (newPermissions.length > 0) {
      this._permissions.push(...newPermissions);
      this.markAsUpdated();
    }
  }

  /**
   * Revokes permissions from the user
   */
  revokePermissions(permissions: Permission[]): void {
    const originalLength = this._permissions.length;

    this._permissions = this._permissions.filter(
      existing => !permissions.some(toRevoke => toRevoke.equals(existing))
    );

    if (this._permissions.length !== originalLength) {
      this.markAsUpdated();
    }
  }

  /**
   * Checks if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    // Admin role has all permissions
    if (this._role.isAdmin()) {
      return true;
    }

    // Check direct permissions
    return this._permissions.some(userPermission =>
      userPermission.equals(permission) || userPermission.implies(permission)
    );
  }

  /**
   * Checks if user has any of the given permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Checks if user has all of the given permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Deactivates the user
   */
  deactivate(): void {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;
    this.markAsUpdated();

    this.addDomainEvent(new UserDeactivatedEvent(this.id, this._email));
  }

  /**
   * Activates the user
   */
  activate(): void {
    if (this._isActive) {
      return;
    }

    this._isActive = true;
    this.markAsUpdated();
  }

  /**
   * Marks email as verified
   */
  verifyEmail(): void {
    if (!this._emailVerified) {
      this._emailVerified = new Date();
      this.markAsUpdated();
    }
  }

  /**
   * Updates last login timestamp
   */
  recordLogin(): void {
    this._lastLoginAt = new Date();
    this.markAsUpdated();
  }

  /**
   * Marks email as verified
   */
  markEmailAsVerified(): void {
    this._emailVerified = new Date();
    this.markAsUpdated();
  }

  /**
   * Checks if user can perform an action on a resource
   */
  canAccess(requiredPermission: Permission): boolean {
    if (!this._isActive) {
      return false;
    }

    return this.hasPermission(requiredPermission);
  }

  /**
   * Validates business invariants
   */
  protected validateInvariants(): void {
    if (!this._email) {
      throw new Error('User must have an email');
    }

    if (!this._role) {
      throw new Error('User must have a role');
    }

    if (!Array.isArray(this._permissions)) {
      throw new Error('User permissions must be an array');
    }
  }

  /**
   * Returns default permissions for a given role
   */
  private static getDefaultPermissionsForRole(role: Role): Permission[] {
    if (role.isAdmin()) {
      return [Permission.create('system:admin')];
    }

    if (role.isEditor()) {
      return [
        Permission.create('source:create'),
        Permission.create('source:read'),
        Permission.create('source:update'),
        Permission.create('source:list'),
        Permission.create('content:create'),
        Permission.create('content:read'),
        Permission.create('content:update'),
        Permission.create('content:list'),
        Permission.create('content:generate'),
        Permission.create('publish:create'),
        Permission.create('publish:read'),
        Permission.create('publish:update'),
        Permission.create('publish:list'),
        Permission.create('image:create'),
        Permission.create('image:read'),
        Permission.create('image:generate'),
      ];
    }

    if (role.isViewer()) {
      return [
        Permission.create('source:read'),
        Permission.create('source:list'),
        Permission.create('content:read'),
        Permission.create('content:list'),
        Permission.create('publish:read'),
        Permission.create('publish:list'),
        Permission.create('image:read'),
      ];
    }

    if (role.isApiClient()) {
      return [
        Permission.create('content:create'),
        Permission.create('content:generate'),
        Permission.create('image:create'),
        Permission.create('image:generate'),
      ];
    }

    // Custom roles start with no permissions
    return [];
  }

  /**
   * Converts to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      email: this._email.getValue(),
      name: this._name,
      image: this._image,
      role: this._role.getValue(),
      permissions: this._permissions.map(p => p.getValue()),
      isActive: this._isActive,
      emailVerified: this._emailVerified,
      lastLoginAt: this._lastLoginAt,
    };
  }
}