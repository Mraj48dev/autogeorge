/**
 * AutoGeorge Simple Security Middleware
 *
 * Versione leggera del middleware di sicurezza che fornisce:
 * - Autenticazione con Clerk
 * - Rate limiting base
 * - Security headers essenziali
 * - Nessuna operazione pesante che possa causare timeout
 */

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@clerk/nextjs';

// Rate limiting semplice in memoria (per sviluppo)
// In produzione usare Redis/Upstash
const rateLimitStore = new Map<string, number[]>();

/**
 * Rate limiting leggero - solo conteggio richieste
 */
function simpleRateLimit(ip: string, limit: number = 100): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minuto

  const requests = rateLimitStore.get(ip) || [];
  const recentRequests = requests.filter(time => time > windowStart);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);

  // Cleanup periodico (10% chance)
  if (Math.random() < 0.1) {
    for (const [key, times] of rateLimitStore.entries()) {
      const validTimes = times.filter(time => time > windowStart);
      if (validTimes.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, validTimes);
      }
    }
  }

  return true;
}

/**
 * Ottieni IP client in modo sicuro
 */
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Security headers essenziali
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Solo header critici per evitare conflitti
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Middleware principale con Clerk
 */
export default authMiddleware({
  // Route pubbliche (no auth richiesta)
  publicRoutes: [
    '/',
    '/api/health',
    '/api/cron/(.*)',
    '/about',
    '/contact',
    '/pricing'
  ],

  // Middleware pre-auth per sicurezza base
  beforeAuth(req) {
    const ip = getClientIP(req);

    // Rate limiting base
    if (!simpleRateLimit(ip, 100)) { // 100 req/min per IP
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0'
        }
      });
    }

    // Continua con autenticazione Clerk
    return NextResponse.next();
  },

  // Post-auth per controlli aggiuntivi
  afterAuth(auth, req) {
    const { pathname } = req.nextUrl;

    // Proteggi route admin
    if (pathname.startsWith('/admin')) {
      if (!auth.userId) {
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', pathname);
        return NextResponse.redirect(signInUrl);
      }
    }

    // Proteggi API admin
    if (pathname.startsWith('/api/admin')) {
      if (!auth.userId) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Aggiungi security headers
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  },

  debug: process.env.NODE_ENV === 'development'
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