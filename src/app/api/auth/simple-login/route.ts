import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Simple temporary login bypass for debugging
 * Sets a session cookie manually while we fix NextAuth v5
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Simple hardcoded check for admin
    if (email === 'alessandro.taurino900@gmail.com' && password) {
      const sessionData = {
        user: {
          id: '873c7ec4-0fc4-4401-bdff-0469287908f4',
          email: 'alessandro.taurino900@gmail.com',
          name: 'Alessandro Taurino Admin',
          role: 'admin',
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set('autogeorge-session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: sessionData.user,
        message: 'Login successful',
      });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Simple login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}