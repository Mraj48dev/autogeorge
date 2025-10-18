import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/dashboard(.*)',
  '/api/admin(.*)'
]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/health',
  '/api/cron(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

// Authorized emails - ONLY these users can access the system
const AUTHORIZED_EMAILS = [
  'mraj48bis@gmail.com',
  'ale.sandrotaurino@gmail.com',
  'alessandro.taurino900@gmail.com'
];

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const userEmail = sessionClaims?.email as string;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for protected routes
  if (isProtectedRoute(req)) {
    // If not signed in, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // SECURITY CHECK: Block unauthorized users even if they have valid Clerk session
    if (userEmail && !AUTHORIZED_EMAILS.includes(userEmail)) {
      console.error(`🚨 SECURITY ALERT: Unauthorized access attempt by ${userEmail} from IP ${req.ip || 'unknown'}`);

      // Return unauthorized response
      return new NextResponse(
        JSON.stringify({
          error: 'Access Denied',
          message: 'Your account is not authorized to access this system. Please contact the administrator.',
          email: userEmail,
          timestamp: new Date().toISOString()
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`✅ Authorized access: ${userEmail} accessing ${req.url}`);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};