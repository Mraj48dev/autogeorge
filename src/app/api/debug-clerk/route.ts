import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    return NextResponse.json({
      status: 'debug',
      clerkConfigured: !!(clerkPublishableKey && clerkSecretKey),
      hasPublishableKey: !!clerkPublishableKey,
      hasSecretKey: !!clerkSecretKey,
      publishableKeyPrefix: clerkPublishableKey ? clerkPublishableKey.substring(0, 20) + '...' : 'MISSING',
      secretKeyPrefix: clerkSecretKey ? 'sk_***' : 'MISSING',
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