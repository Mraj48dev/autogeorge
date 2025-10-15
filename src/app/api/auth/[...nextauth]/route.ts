import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

/**
 * NextAuth v5 API route handler
 * Simplified configuration for Vercel serverless compatibility
 */
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };