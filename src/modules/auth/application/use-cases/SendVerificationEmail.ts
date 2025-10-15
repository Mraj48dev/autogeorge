import { UseCase } from '@/shared/application/base/UseCase';
import { EmailVerificationRepository } from '../../domain/ports/EmailVerificationRepository';
import { EmailService } from '../../domain/ports/EmailService';
import { Email } from '../../domain/value-objects/Email';
import { VerificationToken } from '../../domain/value-objects/VerificationToken';
import { EmailVerification } from '../../domain/entities/EmailVerification';
import { EmailVerificationSent } from '../../domain/events/EmailVerificationSent';

interface SendVerificationEmailRequest {
  email: string;
  name?: string;
  baseUrl?: string;
}

interface SendVerificationEmailResponse {
  verificationId: string;
  email: string;
  token: string;
  expiresAt: Date;
  emailSent: boolean;
  message: string;
}

/**
 * SendVerificationEmail Use Case
 * Sends an email verification to a user
 */
export class SendVerificationEmail extends UseCase<
  SendVerificationEmailRequest,
  SendVerificationEmailResponse
> {
  constructor(
    private emailVerificationRepository: EmailVerificationRepository,
    private emailService: EmailService
  ) {
    super();
  }

  async executeImpl(
    request: SendVerificationEmailRequest
  ): Promise<SendVerificationEmailResponse> {
    // Validate email
    const email = new Email(request.email);

    // Check if there's already a pending verification
    const existingVerification = await this.emailVerificationRepository.findPendingByEmail(email);

    let verification: EmailVerification;

    if (existingVerification && !existingVerification.isExpired()) {
      // Reuse existing verification if not expired
      verification = existingVerification;
    } else {
      // Create new verification
      const token = VerificationToken.generate();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      verification = EmailVerification.create({
        email,
        token,
        expiresAt,
      });

      // Delete old verification if exists
      if (existingVerification) {
        await this.emailVerificationRepository.delete(existingVerification.id);
      }

      // Save new verification
      await this.emailVerificationRepository.save(verification);
    }

    // Prepare verification URL
    const baseUrl = request.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verification.token.value}`;

    // Send verification email
    let emailSent = false;
    let emailError: string | undefined;

    if (this.emailService.isConfigured()) {
      try {
        const emailResult = await this.emailService.sendVerificationEmail({
          recipientEmail: email,
          recipientName: request.name,
          verificationToken: verification.token,
          verificationUrl,
          expiresAt: verification.expiresAt,
        });

        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
        }
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Email sending failed';
      }
    } else {
      emailError = 'Email service not configured';
    }

    // Add domain event if email was sent
    if (emailSent) {
      verification.addDomainEvent(new EmailVerificationSent({
        verificationId: verification.id,
        email: email.value,
        sentAt: new Date(),
        expiresAt: verification.expiresAt,
      }));

      // Update verification with event
      await this.emailVerificationRepository.save(verification);
    }

    return {
      verificationId: verification.id,
      email: email.value,
      token: verification.token.value,
      expiresAt: verification.expiresAt,
      emailSent,
      message: emailSent
        ? 'Email di verifica inviata con successo'
        : `Verifica creata ma email non inviata: ${emailError}`,
    };
  }
}