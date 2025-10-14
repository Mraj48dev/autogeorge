import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG Endpoint - Email Configuration Check
 * TEMPORARY endpoint to verify email environment variables
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = {
      timestamp: new Date().toISOString(),
      emailEnabled: process.env.EMAIL_NOTIFICATIONS_ENABLED,
      hasRecipients: !!process.env.EMAIL_RECIPIENTS,
      recipients: process.env.EMAIL_RECIPIENTS ? process.env.EMAIL_RECIPIENTS.split(',').map(email => email.trim()) : [],

      // Provider detection
      providers: {
        resend: {
          available: !!process.env.RESEND_API_KEY,
          hasFrom: !!process.env.EMAIL_FROM
        },
        smtp: {
          available: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
          host: process.env.SMTP_HOST || 'not-set',
          port: process.env.SMTP_PORT || 'not-set',
          user: process.env.SMTP_USER || 'not-set',
          hasPassword: !!process.env.SMTP_PASSWORD
        }
      },

      // Notification service factory test
      factoryTest: (() => {
        try {
          // Simula la creazione del servizio per vedere quale provider sceglierebbe
          if (process.env.RESEND_API_KEY) {
            return 'would-use-resend';
          }
          if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
            return 'would-use-smtp';
          }
          return 'would-use-placeholder';
        } catch (error) {
          return `factory-error: ${error}`;
        }
      })()
    };

    return NextResponse.json({
      success: true,
      debug: config
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}