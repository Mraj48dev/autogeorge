import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/composition-root/container';

/**
 * Verify Email
 * POST /api/auth/verify-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const container = getContainer();
    const verifyEmail = container.verifyEmail;

    const result = await verifyEmail.execute({ token });

    if (result.isSuccess()) {
      return NextResponse.json({
        success: result.value.success,
        message: result.value.message,
        email: result.value.email,
        userId: result.value.userId,
        isNewUser: result.value.isNewUser,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.error.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Errore interno del server. Riprova.',
      },
      { status: 500 }
    );
  }
}

/**
 * Verify Email via GET (for direct link access)
 * GET /api/auth/verify-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      // Redirect to error page
      const errorUrl = new URL('/auth/verify-email?error=missing_token', request.url);
      return NextResponse.redirect(errorUrl);
    }

    const container = getContainer();
    const verifyEmail = container.verifyEmail;

    const result = await verifyEmail.execute({ token });

    if (result.isSuccess() && result.value.success) {
      // Redirect to success page
      const successUrl = new URL('/auth/verify-email?success=true', request.url);
      return NextResponse.redirect(successUrl);
    } else {
      // Redirect to error page with message
      const errorUrl = new URL('/auth/verify-email?error=verification_failed', request.url);
      return NextResponse.redirect(errorUrl);
    }
  } catch (error) {
    console.error('Email verification error:', error);
    const errorUrl = new URL('/auth/verify-email?error=server_error', request.url);
    return NextResponse.redirect(errorUrl);
  }
}