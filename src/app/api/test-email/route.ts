import { NextRequest, NextResponse } from 'next/server';
import { createNotificationService } from '@/shared/services/notification-service';

/**
 * Test Email Send
 * POST /api/test-email
 * Endpoint semplificato per testare l'invio email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name = 'Test User' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Test Email - Starting email test for:', email);

    // Usa direttamente il notification service
    const notificationService = createNotificationService();

    // Genera URL di verifica fittizio
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const verificationUrl = `http://localhost:3000/auth/verify-email?token=${token}`;

    // Genera email HTML semplice
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Test Email - AutoGeorge</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 32px; text-align: center; margin: -32px -32px 32px -32px; border-radius: 8px 8px 0 0; }
            .button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 24px 0; }
            .url-box { background: #f9fafb; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 14px; color: #374151; margin: 16px 0; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 AutoGeorge - Test Email</h1>
              <p>Verifica il tuo indirizzo email</p>
            </div>

            <h2>Ciao ${name}!</h2>
            <p>Questo è un test dell'invio email di AutoGeorge. Se ricevi questa email, significa che il sistema funziona correttamente!</p>

            <p>Clicca sul pulsante qui sotto per verificare la tua email:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">
                ✅ Verifica Email
              </a>
            </div>

            <p>Se il pulsante non funziona, puoi copiare e incollare questo link:</p>
            <div class="url-box">${verificationUrl}</div>

            <div style="background: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 4px; border-left: 4px solid #9ca3af;">
              <p><strong>🔒 Informazioni di sicurezza:</strong></p>
              <p>• Questo è solo un test</p>
              <p>• Il link non funziona realmente</p>
              <p>• Se hai ricevuto questa email, il sistema email è configurato correttamente</p>
            </div>

            <p>Cordiali saluti,<br>Il team AutoGeorge</p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Ciao ${name}!

Questo è un test dell'invio email di AutoGeorge. Se ricevi questa email, significa che il sistema funziona correttamente!

Clicca su questo link per verificare la tua email:
${verificationUrl}

INFORMAZIONI DI SICUREZZA:
- Questo è solo un test
- Il link non funziona realmente
- Se hai ricevuto questa email, il sistema email è configurato correttamente

Cordiali saluti,
Il team AutoGeorge
    `.trim();

    console.log('📧 Test Email - Attempting to send email...');

    // Invia la notifica email
    const result = await notificationService.sendNotification({
      type: 'system_status',
      severity: 'low',
      title: 'Test Email - Verifica il tuo indirizzo email',
      message: emailText,
      timestamp: new Date().toISOString(),
      service: 'auth-test',
      metadata: {
        htmlContent: emailHtml,
        recipientEmail: email,
        recipientName: name,
        isTestEmail: true,
      },
    });

    console.log('📧 Test Email - Result:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Email di test inviata con successo! Controlla la tua casella di posta.'
        : 'Errore nell\'invio dell\'email di test',
      details: result,
      emailConfiguration: {
        EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED,
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        hasWeb3Forms: !!process.env.WEB3FORMS_ACCESS_KEY,
        hasFormspree: !!process.env.FORMSPREE_ENDPOINT,
      },
      testInfo: {
        email: email,
        token: token,
        verificationUrl: verificationUrl,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('🚨 Test Email - Error occurred:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        emailConfiguration: {
          EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED,
          hasResendKey: !!process.env.RESEND_API_KEY,
          hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
          hasWeb3Forms: !!process.env.WEB3FORMS_ACCESS_KEY,
          hasFormspree: !!process.env.FORMSPREE_ENDPOINT,
        }
      },
      { status: 500 }
    );
  }
}