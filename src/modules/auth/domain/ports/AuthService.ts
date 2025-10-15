/**
 * Auth service port - defines contract for external authentication operations
 */
export interface AuthService {
  /**
   * Gets current authenticated user from Clerk
   */
  getCurrentUser(): Promise<ClerkUserData | null>;

  /**
   * Gets user data from Clerk by user ID
   */
  getUserById(clerkUserId: string): Promise<ClerkUserData | null>;

  /**
   * Validates if a Clerk session is valid
   */
  validateSession(sessionToken?: string): Promise<boolean>;

  /**
   * Signs out user from Clerk
   */
  signOut(): Promise<void>;

  /**
   * Gets user permissions from Clerk (if using Clerk roles)
   */
  getUserPermissions(clerkUserId: string): Promise<string[]>;
}

/**
 * Clerk user data structure
 */
export interface ClerkUserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}