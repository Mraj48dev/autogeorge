import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple session check endpoint that reads our manual session cookie
 * Temporary solution while fixing NextAuth v5
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('autogeorge-session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null, session: null });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if session has expired
    if (new Date() > new Date(sessionData.expires)) {
      // Return response with cleared cookie
      const response = NextResponse.json({ user: null, session: null });
      response.cookies.delete('autogeorge-session');
      return response;
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