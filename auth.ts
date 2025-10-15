import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/shared/database/prisma';
import bcrypt from 'bcryptjs';

/**
 * NextAuth v5 SICURO - NESSUNO ENTRA SENZA REGISTRAZIONE
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 Authorize attempt:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          // Trova l'utente nel database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            return null;
          }

          // Verifica password
          if (!user.password) {
            console.log('❌ No password set for user:', credentials.email);
            return null;
          }

          const passwordValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!passwordValid) {
            console.log('❌ Invalid password for user:', credentials.email);
            return null;
          }

          // BLOCCO TOTALE: Email deve essere verificata
          if (!user.emailVerified) {
            console.log('❌ Email not verified for user:', credentials.email);
            throw new Error('Please verify your email before signing in.');
          }

          console.log('✅ User authorized:', user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: user.emailVerified,
          };

        } catch (error) {
          console.error('❌ Auth error:', error);
          throw error;
        }
      },
    }),
  ],

  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt', // OBBLIGATORIO per Credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 giorni
  },

  callbacks: {
    async jwt({ token, user }) {
      console.log('🔍 JWT callback:', { tokenEmail: token.email, userEmail: user?.email });

      // Quando user è presente (primo login), aggiungi dati al token
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;

        // BLOCCO ASSOLUTO: Solo utenti verificati
        if (!user.emailVerified) {
          console.log('❌ JWT rejected - email not verified:', user.email);
          throw new Error('Email verification required');
        }
      }
      return token;
    },

    async session({ session, token }) {
      console.log('🔍 Session callback:', { sessionEmail: session.user?.email, tokenEmail: token.email });

      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.emailVerified = token.emailVerified as Date;

        // DOPPIO CONTROLLO: Se email non verificata, invalida sessione
        if (!token.emailVerified) {
          console.log('❌ Session rejected - email not verified:', token.email);
          throw new Error('Email verification required');
        }
      }
      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      console.log('🔍 SignIn callback:', { userEmail: user?.email, accountType: account?.type });

      // BLOCCO ASSOLUTO: Solo utenti verificati
      if (user && !user.emailVerified) {
        console.log('❌ SignIn rejected - email not verified:', user.email);
        return false;
      }

      return true;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('📝 Event signIn:', user.email);
    },
    async signOut({ session, token }) {
      console.log('📝 Event signOut');
    },
  },

  debug: true,
});