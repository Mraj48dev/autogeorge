import { UseCase } from '@/shared/application/base/UseCase';
import { EmailVerificationRepository } from '../../domain/ports/EmailVerificationRepository';
import { EmailService } from '../../domain/ports/EmailService';
import { UserRepository } from '../../domain/ports/UserRepository';
import { VerificationToken } from '../../domain/value-objects/VerificationToken';

interface VerifyEmailRequest {
  token: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  email?: string;
  userId?: string;
  isNewUser?: boolean;
}

/**
 * VerifyEmail Use Case
 * Verifies an email address using a verification token
 */
export class VerifyEmail extends UseCase<VerifyEmailRequest, VerifyEmailResponse> {
  constructor(
    private emailVerificationRepository: EmailVerificationRepository,
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {
    super();
  }

  async executeImpl(request: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    try {
      // Validate and create token
      const token = VerificationToken.from(request.token);

      // Find verification by token
      const verification = await this.emailVerificationRepository.findByToken(token);

      if (!verification) {
        return {
          success: false,
          message: 'Token di verifica non valido o scaduto',
        };
      }

      // Check if already verified
      if (verification.isVerified()) {
        return {
          success: true,
          message: 'Email già verificata',
          email: verification.email.value,
        };
      }

      // Check if expired
      if (verification.isExpired()) {
        verification.markAsExpired();
        await this.emailVerificationRepository.save(verification);

        return {
          success: false,
          message: 'Token di verifica scaduto. Richiedi un nuovo link di verifica.',
        };
      }

      // Verify the email
      verification.verify();
      await this.emailVerificationRepository.save(verification);

      // Find or create user
      let user = await this.userRepository.findByEmail(verification.email);
      let isNewUser = false;

      if (!user) {
        // Create new user if doesn't exist
        // This might happen if verification is sent before user registration
        console.log('User not found during email verification, this may indicate an issue with the flow');
        return {
          success: false,
          message: 'Utente non trovato. Registrati prima di verificare l\'email.',
        };
      } else {
        // Mark user as email verified
        user.markEmailAsVerified();
        await this.userRepository.save(user);
      }

      // Send welcome email if configured and user is new
      if (isNewUser && this.emailService.isConfigured()) {
        try {
          await this.emailService.sendWelcomeEmail(
            verification.email,
            user.name?.value
          );
        } catch (error) {
          // Don't fail verification if welcome email fails
          console.warn('Failed to send welcome email:', error);
        }
      }

      return {
        success: true,
        message: 'Email verificata con successo! Ora puoi accedere alla piattaforma.',
        email: verification.email.value,
        userId: user.id,
        isNewUser,
      };
    } catch (error) {
      console.error('Email verification error:', error);

      return {
        success: false,
        message: 'Errore durante la verifica dell\'email. Riprova.',
      };
    }
  }
}