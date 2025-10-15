import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Ultra-minimal NextAuth configuration for debugging serverless issues
 * No OAuth providers, no complex callbacks, just basic credentials
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Hardcoded admin for testing
        if (credentials.email === 'alessandro.taurino900@gmail.com') {
          return {
            id: '873c7ec4-0fc4-4401-bdff-0469287908f4',
            email: 'alessandro.taurino900@gmail.com',
            name: 'Alessandro Taurino Admin',
          };
        }

        return null;
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
  },
};

/**
 * Simplified helper functions for the demo
 * These will be re-integrated with Auth Module once NextAuth is stable
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  // Simplified: admin gets all permissions
  if (userId === '873c7ec4-0fc4-4401-bdff-0469287908f4') {
    return ['system:admin'];
  }
  return [];
}

/**
 * Helper function to check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  // Simplified: admin has all permissions
  if (userId === '873c7ec4-0fc4-4401-bdff-0469287908f4') {
    return true;
  }
  return false;
}