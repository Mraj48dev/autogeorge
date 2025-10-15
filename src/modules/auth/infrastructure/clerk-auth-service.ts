import { currentUser, auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  AuthService,
  UserEntity,
  UserRole,
  AuthenticationError,
  AuthorizationError
} from '../domain';

/**
 * Clerk.com implementation of AuthService
 * This can be used server-side or client-side depending on the context
 */
export class ClerkAuthService implements AuthService {
  async getCurrentUser(): Promise<UserEntity | null> {
    try {
      const user = await currentUser();
      if (!user) return null;

      return this.mapClerkUserToEntity(user);
    } catch (error) {
      console.error('Error getting current user from Clerk:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      return false;
    }
  }

  async requireAuthentication(): Promise<UserEntity> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    return user;
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
    // Clerk handles sign-in through redirects/modals
    // This method is mainly for programmatic sign-ins which Clerk doesn't support directly
    throw new Error('Sign-in should be handled through Clerk components or redirects');
  }

  async signOut(): Promise<void> {
    // For server-side, we need to redirect to Clerk's sign-out URL
    // For client-side, this would use useClerk().signOut()
    redirect('/api/auth/sign-out');
  }

  getSignInUrl(): string {
    return '/sign-in';
  }

  getSignUpUrl(): string {
    return '/sign-up';
  }

  /**
   * Maps Clerk user object to our domain UserEntity
   */
  private mapClerkUserToEntity(clerkUser: any): UserEntity {
    // Determine role from Clerk metadata or default to VIEWER
    const role = this.determineUserRole(clerkUser);

    return new UserEntity(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || clerkUser.username || 'unknown@clerk.com',
      role,
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.firstName || clerkUser.username || undefined,
      new Date(clerkUser.createdAt),
      clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : undefined
    );
  }

  /**
   * Determines user role from Clerk user data
   * You can customize this logic based on your Clerk configuration
   */
  private determineUserRole(clerkUser: any): UserRole {
    // Option 1: Check public metadata
    if (clerkUser.publicMetadata?.role) {
      const role = clerkUser.publicMetadata.role as string;
      if (Object.values(UserRole).includes(role as UserRole)) {
        return role as UserRole;
      }
    }

    // Option 2: Check private metadata (if you have access)
    if (clerkUser.privateMetadata?.role) {
      const role = clerkUser.privateMetadata.role as string;
      if (Object.values(UserRole).includes(role as UserRole)) {
        return role as UserRole;
      }
    }

    // Option 3: Check for admin email patterns
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    if (email.endsWith('@autogeorge.dev') || email.includes('admin')) {
      return UserRole.ADMIN;
    }

    // Option 4: Check organization membership (if using Clerk organizations)
    // if (clerkUser.organizationMemberships?.some(org => org.role === 'admin')) {
    //   return UserRole.ADMIN;
    // }

    // Default role
    return UserRole.VIEWER;
  }

  /**
   * Helper method to update user role in Clerk
   * This would be used by admin functions to promote/demote users
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    try {
      // This would require Clerk Admin API calls
      // For now, we'll just note that this functionality exists
      console.warn('updateUserRole not implemented - requires Clerk Admin API');
    } catch (error) {
      console.error('Error updating user role in Clerk:', error);
      throw new Error('Failed to update user role');
    }
  }
}

/**
 * Client-side Clerk Auth Service for use in React components
 * This uses Clerk's React hooks instead of server functions
 */
export class ClerkClientAuthService implements AuthService {
  private user: any = null;
  private isLoaded: boolean = false;

  constructor(user: any, isLoaded: boolean) {
    this.user = user;
    this.isLoaded = isLoaded;
  }

  async getCurrentUser(): Promise<UserEntity | null> {
    if (!this.isLoaded) {
      throw new Error('Clerk not loaded yet');
    }

    if (!this.user) return null;

    return this.mapClerkUserToEntity(this.user);
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.isLoaded) return false;
    return this.user !== null;
  }

  async requireAuthentication(): Promise<UserEntity> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }
    return user;
  }

  async requireRole(requiredRole: UserRole): Promise<UserEntity> {
    const user = await this.requireAuthentication();

    // Same role hierarchy logic as server-side
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
    throw new Error('Client-side sign-in should use Clerk components');
  }

  async signOut(): Promise<void> {
    // This would be handled by useClerk().signOut() in the calling component
    throw new Error('Client-side sign-out should use useClerk().signOut()');
  }

  getSignInUrl(): string {
    return '/sign-in';
  }

  getSignUpUrl(): string {
    return '/sign-up';
  }

  private mapClerkUserToEntity(clerkUser: any): UserEntity {
    const role = this.determineUserRole(clerkUser);

    return new UserEntity(
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || clerkUser.username || 'unknown@clerk.com',
      role,
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.firstName || clerkUser.username || undefined,
      new Date(clerkUser.createdAt),
      clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : undefined
    );
  }

  private determineUserRole(clerkUser: any): UserRole {
    // Same logic as server-side
    if (clerkUser.publicMetadata?.role) {
      const role = clerkUser.publicMetadata.role as string;
      if (Object.values(UserRole).includes(role as UserRole)) {
        return role as UserRole;
      }
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    if (email.endsWith('@autogeorge.dev') || email.includes('admin')) {
      return UserRole.ADMIN;
    }

    return UserRole.VIEWER;
  }
}