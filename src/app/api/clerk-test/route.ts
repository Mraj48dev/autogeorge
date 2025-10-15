import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test if Clerk environment variables exist
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    return NextResponse.json({
      status: 'ok',
      clerkConfigured: !!(clerkPublishableKey && clerkSecretKey),
      hasPublishableKey: !!clerkPublishableKey,
      hasSecretKey: !!clerkSecretKey,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}