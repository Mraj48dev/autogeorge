/**
 * Next.js Middleware for Multi-Tenant Authentication
 *
 * Protects API routes and admin pages with authentication.
 * Integrates with existing Clerk authentication while adding multi-tenant support.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/api/user(.*)',
  '/api/sites(.*)'
]);

// Define public routes that don't need authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/health(.*)',
  '/api/cron(.*)', // Cron jobs should use API keys instead
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};