import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MIDDLEWARE DI EMERGENZA - BLOCCO TOTALE
 * Blocca TUTTO finché non risolviamo il problema auth
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permetti solo le pagine di auth e API di auth
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/auth' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // BLOCCA TUTTO IL RESTO
  return NextResponse.redirect(new URL('/auth/signin', request.url));
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