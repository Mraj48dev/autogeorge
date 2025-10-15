import { NextRequest, NextResponse } from 'next/server';

/**
 * RESEND Email Test - FALLBACK IMMEDIATO
 * POST /api/email-resend-test
 * Usa Resend.com per email immediate funzionanti
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log('🚀 RESEND Test - Starting...');

    // Test RESEND API
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!resendKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not configured',
        instructions: [
          '1. Vai su https://resend.com/signup',
          '2. Crea account gratuito',
          '3. API Keys → Create API Key',
          '4. Aggiungi su Vercel: RESEND_API_KEY=re_xxxxxxxxxx',
          '5. Redeploy progetto'
        ],
        currentConfig: {
          hasResendKey: !!resendKey,
          emailFrom: emailFrom,
        }
      }, { status: 400 });
    }

    // Invia email con Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AutoGeorge - Email Funzionante!</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 32px; text-align: center; margin: -32px -32px 32px -32px; border-radius: 8px 8px 0 0; }
            .success { background: #d1fae5; border: 2px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 AutoGeorge</h1>
              <p>Sistema Email Funzionante!</p>
            </div>

            <div class="success">
              <h2>✅ SUCCESS!</h2>
              <p>Il sistema email di AutoGeorge ora funziona perfettamente!</p>
            </div>

            <h3>Ciao!</h3>
            <p>Questa email conferma che:</p>
            <ul>
              <li>✅ Resend.com è configurato correttamente</li>
              <li>✅ Le email vengono inviate istantaneamente</li>
              <li>✅ Il sistema di verifica email è operativo</li>
              <li>✅ Gli utenti riceveranno le email di verifica</li>
            </ul>

            <p><strong>Destinatario:</strong> ${email}</p>
            <p><strong>Orario:</strong> ${new Date().toLocaleString('it-IT')}</p>
            <p><strong>Provider:</strong> Resend.com</p>

            <hr>
            <p style="color: #6b7280; font-size: 14px;">
              Questa email è stata inviata da AutoGeorge tramite Resend.com per confermare il funzionamento del sistema.
            </p>
          </div>
        </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: '🎉 AutoGeorge - Sistema Email Funzionante!',
        html: emailHtml,
        text: `
AutoGeorge - Sistema Email Funzionante!

Ciao!

Questa email conferma che il sistema email di AutoGeorge ora funziona perfettamente!

✅ Resend.com è configurato correttamente
✅ Le email vengono inviate istantaneamente
✅ Il sistema di verifica email è operativo
✅ Gli utenti riceveranno le email di verifica

Destinatario: ${email}
Orario: ${new Date().toLocaleString('it-IT')}
Provider: Resend.com

Cordiali saluti,
Il team AutoGeorge
        `.trim()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status} - ${JSON.stringify(result)}`);
    }

    console.log('✅ RESEND Success:', result);

    return NextResponse.json({
      success: true,
      message: `🎉 EMAIL INVIATA CON SUCCESSO! Controlla ${email} (anche spam)`,
      details: {
        messageId: result.id,
        provider: 'Resend.com',
        to: email,
        from: emailFrom,
        timestamp: new Date().toISOString(),
      },
      resendResponse: result,
      instructions: 'Controlla la tua email (anche cartella spam) nei prossimi 30 secondi!'
    });

  } catch (error) {
    console.error('🚨 RESEND Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Email sending failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Verifica RESEND_API_KEY su Vercel',
        'Controlla che la key non sia scaduta',
        'Assicurati di aver verificato il dominio su Resend'
      ],
      environment: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      }
    }, { status: 500 });
  }
}