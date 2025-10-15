import { UserEntity, UserRole } from './user.entity';

export interface AuthService {
  /**
   * Get the currently authenticated user
   * @returns Promise<UserEntity | null> - null if not authenticated
   */
  getCurrentUser(): Promise<UserEntity | null>;

  /**
   * Check if user is currently authenticated
   * @returns Promise<boolean>
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Require authentication - throws if not authenticated
   * @throws AuthenticationError if not authenticated
   */
  requireAuthentication(): Promise<UserEntity>;

  /**
   * Require specific role - throws if user doesn't have role
   * @param requiredRole - minimum role required
   * @throws AuthorizationError if insufficient permissions
   */
  requireRole(requiredRole: UserRole): Promise<UserEntity>;

  /**
   * Sign in a user
   * @param email - user email
   * @param password - user password (if applicable)
   * @returns Promise<UserEntity>
   */
  signIn(email: string, password?: string): Promise<UserEntity>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Get sign-in URL for redirect-based auth
   */
  getSignInUrl(): string;

  /**
   * Get sign-up URL for redirect-based auth
   */
  getSignUpUrl(): string;
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface AuthSession {
  user: UserEntity;
  token: string;
  expiresAt: Date;
}

export interface AuthConfig {
  providers: AuthProvider[];
  redirectUrls: {
    signIn: string;
    signUp: string;
    afterSignIn: string;
    afterSignUp: string;
  };
}

export interface AuthProvider {
  id: string;
  name: string;
  type: 'oauth' | 'email' | 'credentials';
}