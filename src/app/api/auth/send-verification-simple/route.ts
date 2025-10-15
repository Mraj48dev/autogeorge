import { NextRequest, NextResponse } from 'next/server';

/**
 * Send Email Verification - SIMPLE VERSION
 * POST /api/auth/send-verification-simple
 * Solo invio email senza salvataggio database per test immediato
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name = 'User', baseUrl } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔐 Simple Auth Email - Starting for:', email);

    // Verifica configurazione Resend
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'AutoGeorge <onboarding@resend.dev>';

    if (!resendKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not configured'
      }, { status: 400 });
    }

    // Genera token di verifica sicuro (min 32 caratteri)
    const token = Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15) +
                  Date.now().toString(36);

    // Salva il token nel database
    try {
      const { prisma } = await import('@/shared/database/prisma');

      await prisma.emailVerification.create({
        data: {
          token: token,
          email: email,
          status: 'pending',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ore
        },
      });

      console.log('📝 Token saved to database:', token);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        error: 'Database error creating verification token',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // URL di verifica
    const verificationUrl = `${baseUrl || process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

    // Template email HTML professionale
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AutoGeorge - Verifica il tuo indirizzo email</title>
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
              <h1>🚀 AutoGeorge</h1>
              <p>Verifica il tuo indirizzo email</p>
            </div>

            <h2>Ciao ${name}!</h2>
            <p>Grazie per esserti registrato su AutoGeorge! Per completare la registrazione, devi verificare il tuo indirizzo email.</p>

            <p>Clicca sul pulsante qui sotto per verificare la tua email:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">
                ✅ Verifica Email
              </a>
            </div>

            <p>Se il pulsante non funziona, puoi copiare e incollare questo link nel tuo browser:</p>
            <div class="url-box">${verificationUrl}</div>

            <div style="background: #f3f4f6; padding: 16px; margin: 24px 0; border-radius: 4px; border-left: 4px solid #9ca3af;">
              <p><strong>🔒 Informazioni di sicurezza:</strong></p>
              <p>• Questo link scadrà tra 24 ore</p>
              <p>• Se non hai richiesto questa verifica, ignora questa email</p>
              <p>• Non condividere questo link con nessuno</p>
            </div>

            <p>Cordiali saluti,<br>Il team AutoGeorge</p>
          </div>
        </body>
      </html>
    `;

    // Invia email con Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: '🔐 AutoGeorge - Verifica il tuo indirizzo email',
        html: emailHtml,
        text: `
Ciao ${name}!

Grazie per esserti registrato su AutoGeorge! Per completare la registrazione, devi verificare il tuo indirizzo email.

Clicca su questo link per verificare la tua email:
${verificationUrl}

INFORMAZIONI DI SICUREZZA:
- Questo link scadrà tra 24 ore
- Se non hai richiesto questa verifica, ignora questa email
- Non condividere questo link con nessuno

Cordiali saluti,
Il team AutoGeorge
        `.trim()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status} - ${JSON.stringify(result)}`);
    }

    console.log('✅ Simple Auth Email Success:', result);

    return NextResponse.json({
      success: true,
      message: `✅ EMAIL DI VERIFICA INVIATA! Controlla ${email} (anche spam)`,
      verificationId: result.id,
      emailSent: true,
      details: {
        messageId: result.id,
        provider: 'Resend.com',
        to: email,
        from: emailFrom,
        timestamp: new Date().toISOString(),
        token: token,
      },
      instructions: 'Controlla la tua email (anche cartella spam) e clicca sul link di verifica!'
    });

  } catch (error) {
    console.error('🚨 Simple Auth Email Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to send verification email',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Verifica RESEND_API_KEY su Vercel',
        'Con account gratuito puoi inviare solo al tuo indirizzo email'
      ]
    }, { status: 500 });
  }
}