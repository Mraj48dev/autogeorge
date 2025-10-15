import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/factories';

/**
 * Send Email Verification
 * POST /api/auth/send-verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, baseUrl } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const container = createContainer();
    const sendVerificationEmail = container.sendVerificationEmail;

    const result = await sendVerificationEmail.execute({
      email,
      name,
      baseUrl: baseUrl || process.env.NEXTAUTH_URL,
    });

    if (result.isSuccess()) {
      return NextResponse.json({
        success: true,
        message: result.value.message,
        verificationId: result.value.verificationId,
        emailSent: result.value.emailSent,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Failed to send verification email',
          details: result.error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}