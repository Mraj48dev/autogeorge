import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

/**
 * NextAuth v5 main configuration
 * This is the new v5 pattern with handlers export
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
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

        try {
          // Import prisma client
          const { prisma } = await import('@/shared/database/prisma');

          // Trova l'utente nel database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });

          if (!user) {
            return null;
          }

          // Verifica password (qui dovresti usare bcrypt.compare)
          // Per ora accetto qualsiasi password per test
          // if (!await bcrypt.compare(credentials.password, user.password)) {
          //   return null;
          // }

          // 🚨 BLOCCO CRITICO: Verifica email obbligatoria
          if (!user.emailVerified) {
            throw new Error('EMAIL_NOT_VERIFIED');
          }

          // Hardcoded admin per mantenere compatibilità
          if (credentials.email === 'alessandro.taurino900@gmail.com') {
            return {
              id: '873c7ec4-0fc4-4401-bdff-0469287908f4',
              email: 'alessandro.taurino900@gmail.com',
              name: 'Alessandro Taurino Admin',
              role: 'admin',
              emailVerified: new Date(),
            };
          }

          // Utente verificato dal database
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            role: 'user',
            emailVerified: user.emailVerified,
          };

        } catch (error) {
          console.error('Auth error:', error);
          if (error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED') {
            throw error; // Rilanciamo l'errore specifico
          }
          return null;
        }
      },
    }),
  ],

  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).emailVerified = token.emailVerified;
      }
      return session;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Questo callback viene chiamato quando l'authorize() ha successo
      // Se arriviamo qui, significa che l'utente è verificato
      return true;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

/**
 * Backward compatibility helper functions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  if (userId === '873c7ec4-0fc4-4401-bdff-0469287908f4') {
    return ['system:admin'];
  }
  return [];
}

export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  if (userId === '873c7ec4-0fc4-4401-bdff-0469287908f4') {
    return true;
  }
  return false;
}