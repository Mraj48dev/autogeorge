import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * NextAuth.js API route handler
 * Integrates NextAuth with our Clean Architecture Auth Module
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };