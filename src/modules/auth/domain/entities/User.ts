import { AggregateRoot } from '../../../sources/shared/domain/base/Entity';
import { UserId } from '../value-objects/UserId';
import { UserEmail } from '../value-objects/UserEmail';
import { UserName } from '../value-objects/UserName';
import { UserRole } from '../value-objects/UserRole';
import { UserStatus } from '../value-objects/UserStatus';
import { UserCreated } from '../events/UserCreated';
import { UserUpdated } from '../events/UserUpdated';
import { UserLoggedIn } from '../events/UserLoggedIn';
import { UserLoggedOut } from '../events/UserLoggedOut';

/**
 * User Aggregate Root representing a platform user.
 *
 * The User is responsible for managing user identity, authentication,
 * authorization, and profile management.
 *
 * Business Rules:
 * - Users must have a valid email address
 * - Users must have a name
 * - Users have roles that determine permissions
 * - User status controls access to the platform
 * - External auth provider ID links to Clerk
 *
 * Aggregate Invariants:
 * - User must always have valid email and name
 * - External auth provider ID must be unique
 * - Role transitions must be valid
 * - Status transitions must follow valid workflows
 */
export class User extends AggregateRoot<UserId> {
  private _email: UserEmail;
  private _name: UserName;
  private _role: UserRole;
  private _status: UserStatus;
  private _externalAuthProviderId: string; // Clerk user ID
  private _externalAuthProvider: string; // 'clerk'
  private _profileImageUrl?: string;
  private _lastLoginAt?: Date;
  private _metadata?: UserMetadata;

  constructor(
    id: UserId,
    email: UserEmail,
    name: UserName,
    externalAuthProviderId: string,
    role: UserRole = UserRole.user(),
    status: UserStatus = UserStatus.active(),
    externalAuthProvider: string = 'clerk',
    profileImageUrl?: string,
    lastLoginAt?: Date,
    metadata?: UserMetadata,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._email = email;
    this._name = name;
    this._role = role;
    this._status = status;
    this._externalAuthProviderId = externalAuthProviderId;
    this._externalAuthProvider = externalAuthProvider;
    this._profileImageUrl = profileImageUrl;
    this._lastLoginAt = lastLoginAt;
    this._metadata = metadata;

    this.validateInvariants();
  }

  /**
   * Creates a new user from Clerk authentication
   */
  static createFromClerk(
    email: UserEmail,
    name: UserName,
    clerkUserId: string,
    profileImageUrl?: string
  ): User {
    const id = UserId.generate();

    const user = new User(
      id,
      email,
      name,
      clerkUserId,
      UserRole.user(), // Default role
      UserStatus.active(),
      'clerk',
      profileImageUrl
    );

    user.addDomainEvent(
      new UserCreated(
        id.getValue(),
        email.getValue(),
        name.getValue(),
        clerkUserId
      )
    );

    return user;
  }

  // Getters
  get email(): UserEmail {
    return this._email;
  }

  get name(): UserName {
    return this._name;
  }

  get role(): UserRole {
    return this._role;
  }

  get status(): UserStatus {
    return this._status;
  }

  get externalAuthProviderId(): string {
    return this._externalAuthProviderId;
  }

  get externalAuthProvider(): string {
    return this._externalAuthProvider;
  }

  get profileImageUrl(): string | undefined {
    return this._profileImageUrl;
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt ? new Date(this._lastLoginAt) : undefined;
  }

  get metadata(): UserMetadata | undefined {
    return this._metadata;
  }

  /**
   * Updates the user's email
   */
  updateEmail(email: UserEmail): void {
    const previousEmail = this._email.getValue();
    this._email = email;
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'profile',
        { email: { from: previousEmail, to: email.getValue() } }
      )
    );
  }

  /**
   * Updates the user's name
   */
  updateName(name: UserName): void {
    const previousName = this._name.getValue();
    this._name = name;
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'profile',
        { name: { from: previousName, to: name.getValue() } }
      )
    );
  }

  /**
   * Updates the user's profile image
   */
  updateProfileImage(profileImageUrl?: string): void {
    const previousImageUrl = this._profileImageUrl;
    this._profileImageUrl = profileImageUrl;
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'profile',
        { profileImageUrl: { from: previousImageUrl, to: profileImageUrl } }
      )
    );
  }

  /**
   * Promotes user to admin role
   */
  promoteToAdmin(): void {
    if (!this._role.canTransitionTo(UserRole.admin())) {
      throw new Error(`Cannot promote user to admin from ${this._role.getValue()} role`);
    }

    const previousRole = this._role.getValue();
    this._role = UserRole.admin();
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'role',
        { role: { from: previousRole, to: 'admin' } }
      )
    );
  }

  /**
   * Demotes user to regular user role
   */
  demoteToUser(): void {
    if (!this._role.canTransitionTo(UserRole.user())) {
      throw new Error(`Cannot demote user to user from ${this._role.getValue()} role`);
    }

    const previousRole = this._role.getValue();
    this._role = UserRole.user();
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'role',
        { role: { from: previousRole, to: 'user' } }
      )
    );
  }

  /**
   * Suspends the user
   */
  suspend(): void {
    if (!this._status.canTransitionTo(UserStatus.suspended())) {
      throw new Error(`Cannot suspend user in ${this._status.getValue()} status`);
    }

    const previousStatus = this._status.getValue();
    this._status = UserStatus.suspended();
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'status',
        { status: { from: previousStatus, to: 'suspended' } }
      )
    );
  }

  /**
   * Activates the user
   */
  activate(): void {
    if (!this._status.canTransitionTo(UserStatus.active())) {
      throw new Error(`Cannot activate user in ${this._status.getValue()} status`);
    }

    const previousStatus = this._status.getValue();
    this._status = UserStatus.active();
    this.markAsUpdated();

    this.addDomainEvent(
      new UserUpdated(
        this.id.getValue(),
        'status',
        { status: { from: previousStatus, to: 'active' } }
      )
    );
  }

  /**
   * Records a successful login
   */
  recordLogin(): void {
    this._lastLoginAt = new Date();
    this.updateMetadata({
      ...this._metadata,
      totalLogins: (this._metadata?.totalLogins || 0) + 1,
      lastLogin: {
        timestamp: this._lastLoginAt,
        provider: this._externalAuthProvider
      }
    });

    this.markAsUpdated();

    this.addDomainEvent(
      new UserLoggedIn(
        this.id.getValue(),
        this._lastLoginAt,
        this._externalAuthProvider
      )
    );
  }

  /**
   * Records a logout
   */
  recordLogout(): void {
    const logoutTime = new Date();
    this.updateMetadata({
      ...this._metadata,
      lastLogout: {
        timestamp: logoutTime,
        provider: this._externalAuthProvider
      }
    });

    this.markAsUpdated();

    this.addDomainEvent(
      new UserLoggedOut(
        this.id.getValue(),
        logoutTime,
        this._externalAuthProvider
      )
    );
  }

  /**
   * Checks if user has admin privileges
   */
  isAdmin(): boolean {
    return this._role.isAdmin();
  }

  /**
   * Checks if user can access the platform
   */
  canAccess(): boolean {
    return this._status.isActive();
  }

  /**
   * Checks if user has permission for a specific action
   */
  hasPermission(permission: string): boolean {
    return this._role.hasPermission(permission);
  }

  private updateMetadata(metadata: UserMetadata): void {
    this._metadata = metadata;
  }

  /**
   * Returns user summary for listings
   */
  getSummary(): UserSummary {
    return {
      id: this.id.getValue(),
      email: this._email.getValue(),
      name: this._name.getValue(),
      role: this._role.getValue(),
      status: this._status.getValue(),
      profileImageUrl: this._profileImageUrl,
      lastLoginAt: this._lastLoginAt,
      totalLogins: this._metadata?.totalLogins || 0,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates aggregate invariants
   */
  protected validateInvariants(): void {
    if (!this._externalAuthProviderId) {
      throw new Error('User must have an external auth provider ID');
    }

    if (!this._externalAuthProvider) {
      throw new Error('User must have an external auth provider');
    }
  }

  /**
   * Returns the complete user data for JSON serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      email: this._email.getValue(),
      name: this._name.getValue(),
      role: this._role.getValue(),
      status: this._status.getValue(),
      externalAuthProviderId: this._externalAuthProviderId,
      externalAuthProvider: this._externalAuthProvider,
      profileImageUrl: this._profileImageUrl,
      lastLoginAt: this._lastLoginAt,
      metadata: this._metadata,
    };
  }
}

// Metadata interface
export interface UserMetadata {
  totalLogins?: number;
  lastLogin?: {
    timestamp: Date;
    provider: string;
    [key: string]: any;
  };
  lastLogout?: {
    timestamp: Date;
    provider: string;
    [key: string]: any;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

// Summary interface for list views
export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  profileImageUrl?: string;
  lastLoginAt?: Date;
  totalLogins: number;
  createdAt: Date;
  updatedAt: Date;
}