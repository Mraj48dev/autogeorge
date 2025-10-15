import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
    hasClerkPublic: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    clerkSecretPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10),
    clerkPublicPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10)
  });
}