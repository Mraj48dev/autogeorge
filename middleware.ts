import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

/**
 * 🔒 CLERK.COM MIDDLEWARE - SICUREZZA ENTERPRISE
 * Protegge automaticamente tutte le route tranne quelle pubbliche
 */
export default authMiddleware({
  // Pagine pubbliche (accessibili senza login)
  publicRoutes: [
    '/',
    '/sign-in',
    '/sign-up',
    '/maintenance'
  ],

  // Pagine sempre protette (richiedono login)
  protectedRoutes: [
    '/admin(.*)',
    '/api/admin(.*)'
  ],

  // Dopo login, redirect alla dashboard
  afterAuth(auth, req, evt) {
    // Se utente loggato e su pagina pubblica, redirect alla dashboard
    if (auth.userId && auth.isPublicRoute) {
      if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/sign-in') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }

    // Se utente non loggato e prova ad accedere a pagina protetta
    if (!auth.userId && !auth.isPublicRoute) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    return NextResponse.next();
  }
});

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