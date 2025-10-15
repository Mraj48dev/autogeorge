import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🚨 EMERGENCY SECURITY LOCKDOWN
 * Sistema in migrazione da NextAuth a Clerk.com
 * TUTTO BLOCCATO tranne pagine pubbliche essenziali
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PAGINE PUBBLICHE PERMESSE
  const allowedPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/maintenance',
    '/api/health',
    '/_next',
    '/favicon.ico'
  ];

  // Se è una pagina permessa, passa
  if (allowedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ⚠️ TUTTO IL RESTO BLOCCATO - REINDIRIZZA A MANUTENZIONE
  console.warn(`🚨 SECURITY LOCKDOWN: Blocked access to ${pathname}`);
  return NextResponse.redirect(new URL('/maintenance', request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};