import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🚨 LOCKDOWN TOTALE - SICUREZZA MASSIMA
 * BLOCCA COMPLETAMENTE TUTTO FINO A SISTEMA AUTH SICURO
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // BLOCCO TOTALE: Solo pagina manutenzione
  if (pathname === '/maintenance') {
    return NextResponse.next();
  }

  // REDIRECT TUTTO ALLA PAGINA MANUTENZIONE
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