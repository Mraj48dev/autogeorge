import { Email } from '../value-objects/Email';
import { VerificationToken } from '../value-objects/VerificationToken';

export interface VerificationEmailData {
  recipientEmail: Email;
  recipientName?: string;
  verificationToken: VerificationToken;
  verificationUrl: string;
  expiresAt: Date;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

/**
 * Email Service Interface
 * Port for sending verification emails
 */
export interface EmailService {
  /**
   * Send verification email
   */
  sendVerificationEmail(data: VerificationEmailData): Promise<EmailSendResult>;

  /**
   * Send welcome email after verification
   */
  sendWelcomeEmail(email: Email, name?: string): Promise<EmailSendResult>;

  /**
   * Send email verification reminder
   */
  sendVerificationReminder(data: VerificationEmailData): Promise<EmailSendResult>;

  /**
   * Check if email service is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Test email connectivity
   */
  testConnection(): Promise<boolean>;
}