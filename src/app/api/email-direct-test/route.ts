import { NextRequest, NextResponse } from 'next/server';

/**
 * Direct Email Test - NO VALUE OBJECTS
 * POST /api/email-direct-test
 * Testa SMTP Hostinger senza Value Objects problematici
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Import dinamico per evitare problemi inizializzazione
    const { createNotificationService } = await import('@/shared/services/notification-service');

    console.log('🧪 Direct Email Test - Environment check:');
    console.log('EMAIL_NOTIFICATIONS_ENABLED:', process.env.EMAIL_NOTIFICATIONS_ENABLED);
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASSWORD set:', !!process.env.SMTP_PASSWORD);

    const notificationService = createNotificationService();

    const emailHtml = `
      <h1>🚀 AutoGeorge SMTP Test</h1>
      <p>Ciao! Questo è un test diretto del sistema SMTP Hostinger.</p>
      <p><strong>Email destinatario:</strong> ${email}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p>Se ricevi questa email, il sistema SMTP Hostinger funziona perfettamente!</p>
    `;

    const result = await notificationService.sendNotification({
      type: 'system_status',
      severity: 'low',
      title: 'Test SMTP Hostinger - AutoGeorge',
      message: 'Test diretto sistema email Hostinger',
      timestamp: new Date().toISOString(),
      service: 'smtp-test',
      metadata: {
        htmlContent: emailHtml,
        recipientEmail: email,
        isDirectTest: true,
      },
    });

    console.log('📧 Direct Email Test Result:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Email inviata con successo a ${email}! Controlla la tua casella.`
        : 'Errore invio email',
      details: result,
      environment: {
        EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASSWORD,
        SMTP_PORT: process.env.SMTP_PORT,
        EMAIL_FROM: process.env.EMAIL_FROM,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('🚨 Direct Email Test Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASSWORD,
      }
    }, { status: 500 });
  }
}