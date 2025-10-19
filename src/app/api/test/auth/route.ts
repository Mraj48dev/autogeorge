import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { error: 'Internal server error', authenticated: false },
      { status: 500 }
    );
  }
}