import {
  AuthService,
  UserEntity,
  UserRole,
  AuthenticationError,
  AuthorizationError
} from '../domain';

/**
 * Mock AuthService for development and testing
 * This will be replaced with NextAuth or Clerk implementation
 */
export class MockAuthService implements AuthService {
  private currentUser: UserEntity | null = null;

  constructor() {
    // Simulate a logged-in admin user for development
    this.currentUser = new UserEntity(
      'mock-admin-123',
      'admin@autogeorge.dev',
      UserRole.ADMIN,
      'Admin User',
      new Date(),
      new Date()
    );
  }

  async getCurrentUser(): Promise<UserEntity | null> {
    return this.currentUser;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.currentUser !== null;
  }

  async requireAuthentication(): Promise<UserEntity> {
    if (!this.currentUser) {
      throw new AuthenticationError('User must be authenticated to access this resource');
    }
    return this.currentUser;
  }

  async requireRole(requiredRole: UserRole): Promise<UserEntity> {
    const user = await this.requireAuthentication();

    // Role hierarchy: ADMIN > EDITOR > VIEWER
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.EDITOR]: 1,
      [UserRole.ADMIN]: 2
    };

    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      throw new AuthorizationError(
        `Role ${requiredRole} required, but user has role ${user.role}`
      );
    }

    return user;
  }

  async signIn(email: string, password?: string): Promise<UserEntity> {
    // Mock sign-in logic
    this.currentUser = new UserEntity(
      'mock-user-' + Date.now(),
      email,
      UserRole.ADMIN, // For now, everyone is admin
      email.split('@')[0],
      new Date(),
      new Date()
    );
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
  }

  getSignInUrl(): string {
    return '/auth/signin';
  }

  getSignUpUrl(): string {
    return '/auth/signup';
  }

  // Development helpers
  setMockUser(user: UserEntity | null): void {
    this.currentUser = user;
  }

  createMockUser(email: string, role: UserRole = UserRole.ADMIN): UserEntity {
    return new UserEntity(
      'mock-' + Date.now(),
      email,
      role,
      email.split('@')[0],
      new Date(),
      new Date()
    );
  }
}