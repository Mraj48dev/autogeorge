import { currentUser, clerkClient, auth } from '@clerk/nextjs/server';
import { AuthService, ClerkUserData } from '../../domain/ports/AuthService';

/**
 * Clerk implementation of AuthService
 */
export class ClerkAuthService implements AuthService {
  async getCurrentUser(): Promise<ClerkUserData | null> {
    try {
      const user = await currentUser();
      if (!user) {
        return null;
      }

      return this.mapClerkUserToData(user);
    } catch (error) {
      console.error('Error getting current user from Clerk:', error);
      return null;
    }
  }

  async getUserById(clerkUserId: string): Promise<ClerkUserData | null> {
    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      if (!user) {
        return null;
      }

      return this.mapClerkUserToData(user);
    } catch (error) {
      console.error('Error getting user by ID from Clerk:', error);
      return null;
    }
  }

  async validateSession(sessionToken?: string): Promise<boolean> {
    try {
      const { userId } = auth();
      return !!userId;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    // Clerk handles sign out on the client side
    // This method is here for interface completeness
    throw new Error('Sign out should be handled on the client side with Clerk components');
  }

  async getUserPermissions(clerkUserId: string): Promise<string[]> {
    try {
      // For now, return empty array
      // In the future, you could implement Clerk organizations/roles
      // or use custom user metadata
      return [];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  private mapClerkUserToData(user: any): ClerkUserData {
    const primaryEmail = user.emailAddresses?.find((email: any) => email.id === user.primaryEmailAddressId);

    return {
      id: user.id,
      email: primaryEmail?.emailAddress || '',
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      imageUrl: user.imageUrl,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }
}