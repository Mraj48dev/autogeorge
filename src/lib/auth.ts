import { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

/**
 * NextAuth v5 configuration for AutoGeorge
 * Simplified for serverless compatibility
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
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
            role: 'admin',
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

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

// For backward compatibility - export as authOptions too
export const authOptions = authConfig;

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