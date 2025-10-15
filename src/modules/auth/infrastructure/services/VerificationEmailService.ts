import { EmailService, VerificationEmailData, EmailSendResult } from '../../domain/ports/EmailService';
import { Email } from '../../domain/value-objects/Email';
import { NotificationService, createNotificationService } from '@/shared/services/notification-service';

/**
 * Verification Email Service
 * Implementation using the existing NotificationService
 */
export class VerificationEmailService implements EmailService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = createNotificationService();
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<EmailSendResult> {
    try {
      const verificationHtml = this.generateVerificationEmailHtml(data);
      const verificationText = this.generateVerificationEmailText(data);

      // Use notification service to send email
      const result = await this.notificationService.sendNotification({
        type: 'system_status',
        severity: 'low',
        title: 'Verifica il tuo indirizzo email',
        message: verificationText,
        timestamp: new Date().toISOString(),
        service: 'auth-verification',
        metadata: {
          htmlContent: verificationHtml,
          recipientEmail: data.recipientEmail.value,
          recipientName: data.recipientName,
          isVerificationEmail: true,
        },
      });

      return {
        success: result.success,
        messageId: result.results?.[0]?.details?.messageId,
        error: result.success ? undefined : 'Failed to send verification email',
        provider: result.results?.[0]?.details?.service || 'notification-service',
      };
    } catch (error) {
      console.error('Verification email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendWelcomeEmail(email: Email, name?: string): Promise<EmailSendResult> {
    try {
      const welcomeHtml = this.generateWelcomeEmailHtml(email, name);
      const welcomeText = this.generateWelcomeEmailText(email, name);

      const result = await this.notificationService.sendNotification({
        type: 'system_status',
        severity: 'low',
        title: 'Benvenuto in AutoGeorge!',
        message: welcomeText,
        timestamp: new Date().toISOString(),
        service: 'auth-welcome',
        metadata: {
          htmlContent: welcomeHtml,
          recipientEmail: email.value,
          recipientName: name,
          isWelcomeEmail: true,
        },
      });

      return {
        success: result.success,
        messageId: result.results?.[0]?.details?.messageId,
        error: result.success ? undefined : 'Failed to send welcome email',
        provider: result.results?.[0]?.details?.service || 'notification-service',
      };
    } catch (error) {
      console.error('Welcome email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendVerificationReminder(data: VerificationEmailData): Promise<EmailSendResult> {
    try {
      const reminderHtml = this.generateReminderEmailHtml(data);
      const reminderText = this.generateReminderEmailText(data);

      const result = await this.notificationService.sendNotification({
        type: 'system_status',
        severity: 'medium',
        title: 'Promemoria: Verifica il tuo indirizzo email',
        message: reminderText,
        timestamp: new Date().toISOString(),
        service: 'auth-reminder',
        metadata: {
          htmlContent: reminderHtml,
          recipientEmail: data.recipientEmail.value,
          recipientName: data.recipientName,
          isReminderEmail: true,
        },
      });

      return {
        success: result.success,
        messageId: result.results?.[0]?.details?.messageId,
        error: result.success ? undefined : 'Failed to send reminder email',
        provider: result.results?.[0]?.details?.service || 'notification-service',
      };
    } catch (error) {
      console.error('Reminder email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isConfigured(): boolean {
    // Check if notification service has email configuration
    return !!(
      process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true' ||
      process.env.RESEND_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) ||
      process.env.WEB3FORMS_ACCESS_KEY ||
      process.env.FORMSPREE_ENDPOINT
    );
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Send a test notification to verify the service works
      const result = await this.notificationService.sendNotification({
        type: 'system_status',
        severity: 'low',
        title: 'Email Service Test',
        message: 'This is a test email to verify the email service configuration.',
        timestamp: new Date().toISOString(),
        service: 'auth-test',
        metadata: {
          isTestEmail: true,
        },
      });

      return result.success;
    } catch (error) {
      console.error('Email service test failed:', error);
      return false;
    }
  }

  private generateVerificationEmailHtml(data: VerificationEmailData): string {
    const recipientName = data.recipientName || 'Utente';
    const expirationHours = Math.ceil((data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifica Email - AutoGeorge</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .header p { margin: 8px 0 0; opacity: 0.9; }
            .content { padding: 32px; }
            .content h2 { color: #1f2937; margin: 0 0 16px; font-size: 20px; }
            .content p { color: #6b7280; line-height: 1.6; margin: 0 0 16px; }
            .cta-button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 24px 0; }
            .cta-button:hover { background: #2563eb; }
            .security-notice { background: #f3f4f6; border-left: 4px solid #9ca3af; padding: 16px; margin: 24px 0; border-radius: 4px; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
            .token-display { background: #f9fafb; padding: 16px; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; color: #374151; margin: 16px 0; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 AutoGeorge</h1>
              <p>Verifica il tuo indirizzo email</p>
            </div>

            <div class="content">
              <h2>Ciao ${recipientName}!</h2>

              <p>Grazie per esserti registrato su AutoGeorge. Per completare la registrazione, devi verificare il tuo indirizzo email.</p>

              <p>Clicca sul pulsante qui sotto per verificare la tua email:</p>

              <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="cta-button">
                  ✅ Verifica Email
                </a>
              </div>

              <p>Se il pulsante non funziona, puoi copiare e incollare questo link nel tuo browser:</p>

              <div class="token-display">
                ${data.verificationUrl}
              </div>

              <div class="security-notice">
                <p><strong>🔒 Informazioni di sicurezza:</strong></p>
                <p>• Questo link scadrà tra ${expirationHours} ore</p>
                <p>• Se non hai richiesto questa verifica, ignora questa email</p>
                <p>• Non condividere questo link con nessuno</p>
              </div>

              <p>Se hai problemi o domande, contatta il nostro supporto.</p>

              <p>Cordiali saluti,<br>Il team AutoGeorge</p>
            </div>

            <div class="footer">
              <p>AutoGeorge - Piattaforma di generazione automatica contenuti</p>
              <p>Questa email è stata inviata automaticamente. Non rispondere a questa email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateVerificationEmailText(data: VerificationEmailData): string {
    const recipientName = data.recipientName || 'Utente';
    const expirationHours = Math.ceil((data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

    return `
Ciao ${recipientName}!

Grazie per esserti registrato su AutoGeorge. Per completare la registrazione, devi verificare il tuo indirizzo email.

Clicca su questo link per verificare la tua email:
${data.verificationUrl}

INFORMAZIONI DI SICUREZZA:
- Questo link scadrà tra ${expirationHours} ore
- Se non hai richiesto questa verifica, ignora questa email
- Non condividere questo link con nessuno

Se hai problemi o domande, contatta il nostro supporto.

Cordiali saluti,
Il team AutoGeorge

---
AutoGeorge - Piattaforma di generazione automatica contenuti
Questa email è stata inviata automaticamente. Non rispondere a questa email.
    `.trim();
  }

  private generateWelcomeEmailHtml(email: Email, name?: string): string {
    const recipientName = name || 'Utente';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Benvenuto - AutoGeorge</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px; }
            .feature-list { list-style: none; padding: 0; }
            .feature-list li { padding: 8px 0; display: flex; align-items: center; }
            .feature-list li::before { content: "✅"; margin-right: 12px; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Benvenuto in AutoGeorge!</h1>
            </div>

            <div class="content">
              <h2>Ciao ${recipientName}!</h2>

              <p>La tua email è stata verificata con successo! Ora puoi accedere a tutte le funzionalità di AutoGeorge.</p>

              <h3>Cosa puoi fare ora:</h3>
              <ul class="feature-list">
                <li>Configurare le tue fonti RSS</li>
                <li>Impostare automazioni per la generazione contenuti</li>
                <li>Gestire i tuoi siti WordPress</li>
                <li>Monitorare le pubblicazioni automatiche</li>
              </ul>

              <p>Inizia esplorando la dashboard per configurare la tua prima automazione!</p>

              <p>Buon lavoro,<br>Il team AutoGeorge</p>
            </div>

            <div class="footer">
              <p>AutoGeorge - Piattaforma di generazione automatica contenuti</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(email: Email, name?: string): string {
    const recipientName = name || 'Utente';

    return `
Ciao ${recipientName}!

La tua email è stata verificata con successo! Ora puoi accedere a tutte le funzionalità di AutoGeorge.

Cosa puoi fare ora:
✅ Configurare le tue fonti RSS
✅ Impostare automazioni per la generazione contenuti
✅ Gestire i tuoi siti WordPress
✅ Monitorare le pubblicazioni automatiche

Inizia esplorando la dashboard per configurare la tua prima automazione!

Buon lavoro,
Il team AutoGeorge

---
AutoGeorge - Piattaforma di generazione automatica contenuti
    `.trim();
  }

  private generateReminderEmailHtml(data: VerificationEmailData): string {
    return this.generateVerificationEmailHtml(data).replace(
      'Verifica il tuo indirizzo email',
      'Promemoria: Verifica il tuo indirizzo email'
    ).replace(
      'Grazie per esserti registrato',
      'Ti ricordiamo che non hai ancora completato la verifica della tua email'
    );
  }

  private generateReminderEmailText(data: VerificationEmailData): string {
    return this.generateVerificationEmailText(data).replace(
      'Grazie per esserti registrato',
      'Ti ricordiamo che non hai ancora completato la verifica della tua email'
    );
  }
}