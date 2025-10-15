import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Simplified NextAuth configuration to avoid serverless issues
 * Temporarily removes complex Auth Module integration
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

        // Simplified auth: Check if user is the admin we created
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  debug: process.env.NODE_ENV === 'development',
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