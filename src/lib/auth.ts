import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Config } from '@/shared/config/env';
import { createContainer } from '@/composition-root/container';

// Get configuration
const config = Config.fromEnvironment();

// Create container for auth services
const container = createContainer();

/**
 * NextAuth configuration integrated with Auth Module
 * Using our own Auth Module instead of PrismaAdapter
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

        try {
          // Use our Auth Module to authenticate
          const nextAuthAdapter = container.nextAuthAdapter;
          const result = await nextAuthAdapter.getEnhancedUser(credentials.email);

          if (result) {
            // In production, verify password hash here
            // For now, we'll accept any password for existing users
            return {
              id: result.id,
              email: result.email,
              name: result.name,
              image: result.image,
              role: result.role,
              permissions: result.permissions,
            };
          }

          return null;
        } catch (error) {
          console.error('Credentials auth error:', error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: config.auth.providers.google.clientId || '',
      clientSecret: config.auth.providers.google.clientSecret || '',
    }),
    GitHubProvider({
      clientId: config.auth.providers.github.clientId || '',
      clientSecret: config.auth.providers.github.clientSecret || '',
    }),
  ],

  secret: config.auth.nextAuthSecret,

  session: {
    strategy: 'jwt',
    maxAge: config.auth.sessionMaxAge,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Use our Auth Module for sign-in logic
        const nextAuthAdapter = container.nextAuthAdapter;
        return await nextAuthAdapter.signIn(user, account, profile);
      } catch (error) {
        console.error('Sign-in error:', error);
        return false;
      }
    },

    async session({ session, token }) {
      try {
        // Enhance session with our domain data
        const nextAuthAdapter = container.nextAuthAdapter;
        return await nextAuthAdapter.session(session, token);
      } catch (error) {
        console.error('Session error:', error);
        return session;
      }
    },

    async jwt({ token, user, account, profile }) {
      try {
        // Enhance JWT token with our domain data
        const nextAuthAdapter = container.nextAuthAdapter;
        return await nextAuthAdapter.jwt(token, user, account, profile);
      } catch (error) {
        console.error('JWT error:', error);
        return token;
      }
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },

    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },

  debug: config.app.isDevelopment,
};

/**
 * Helper function to get user permissions
 * Can be used in API routes or middleware
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const nextAuthAdapter = container.nextAuthAdapter;
    const result = await nextAuthAdapter.validateUserPermissions(userId, []);
    return result.user?.permissions.map(p => p.getValue()) || [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Helper function to check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const nextAuthAdapter = container.nextAuthAdapter;
    const result = await nextAuthAdapter.validateUserPermissions(userId, [permission]);
    return result.hasAccess;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}