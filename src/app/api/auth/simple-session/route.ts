import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Simple session check endpoint that reads our manual session cookie
 * Temporary solution while fixing NextAuth v5
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('autogeorge-session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null, session: null });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if session has expired
    if (new Date() > new Date(sessionData.expires)) {
      // Clear expired session
      cookieStore.delete('autogeorge-session');
      return NextResponse.json({ user: null, session: null });
    }

    return NextResponse.json({
      user: sessionData.user,
      session: {
        user: sessionData.user,
        expires: sessionData.expires,
      },
    });
  } catch (error) {
    console.error('Simple session error:', error);
    return NextResponse.json({ user: null, session: null });
  }
}