import { EmailVerification } from '../entities/EmailVerification';
import { Email } from '../value-objects/Email';
import { VerificationToken } from '../value-objects/VerificationToken';

/**
 * EmailVerification Repository Interface
 * Port for persisting and retrieving email verifications
 */
export interface EmailVerificationRepository {
  /**
   * Save email verification
   */
  save(verification: EmailVerification): Promise<void>;

  /**
   * Find verification by token
   */
  findByToken(token: VerificationToken): Promise<EmailVerification | null>;

  /**
   * Find verification by email
   */
  findByEmail(email: Email): Promise<EmailVerification | null>;

  /**
   * Find verification by ID
   */
  findById(id: string): Promise<EmailVerification | null>;

  /**
   * Find pending verification by email
   */
  findPendingByEmail(email: Email): Promise<EmailVerification | null>;

  /**
   * Delete verification
   */
  delete(id: string): Promise<void>;

  /**
   * Delete expired verifications (cleanup)
   */
  deleteExpired(): Promise<number>;

  /**
   * Get verification statistics
   */
  getStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    expired: number;
  }>;
}