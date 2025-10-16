import { Result } from '@/shared/domain/types/Result';
import { User } from '../entities/User';

export interface AuthenticationResult {
  user: User;
  token?: string;
  expiresAt?: Date;
}

export interface AuthenticationService {
  /**
   * Authenticate user with Clerk
   */
  authenticate(clerkUserId: string): Promise<Result<AuthenticationResult>>;

  /**
   * Create user in external auth provider (Clerk)
   */
  createExternalUser(email: string, password?: string): Promise<Result<{
    externalUserId: string;
    email: string;
  }>>;

  /**
   * Update user in external auth provider
   */
  updateExternalUser(clerkUserId: string, updates: {
    email?: string;
    role?: string;
  }): Promise<Result<void>>;

  /**
   * Delete user from external auth provider
   */
  deleteExternalUser(clerkUserId: string): Promise<Result<void>>;

  /**
   * Verify if external user exists
   */
  verifyExternalUser(clerkUserId: string): Promise<Result<boolean>>;

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<Result<User | null>>;
}