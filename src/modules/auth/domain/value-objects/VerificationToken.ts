import { ValueObject } from '@/shared/domain/base/ValueObject';
import { randomBytes } from 'crypto';

/**
 * VerificationToken Value Object
 * Represents a secure token for email verification
 */
export class VerificationToken extends ValueObject<string> {
  public static readonly MIN_LENGTH = 32;
  public static readonly MAX_LENGTH = 128;

  constructor(value: string) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('VerificationToken must be a non-empty string');
    }

    if (this.value.length < VerificationToken.MIN_LENGTH) {
      throw new Error(`VerificationToken must be at least ${VerificationToken.MIN_LENGTH} characters`);
    }

    if (this.value.length > VerificationToken.MAX_LENGTH) {
      throw new Error(`VerificationToken cannot exceed ${VerificationToken.MAX_LENGTH} characters`);
    }

    // Check if it's a valid hex string (for crypto tokens)
    if (!/^[a-fA-F0-9]+$/.test(this.value)) {
      throw new Error('VerificationToken must be a valid hexadecimal string');
    }
  }

  /**
   * Generate a secure random verification token
   */
  public static generate(): VerificationToken {
    const bytes = randomBytes(32); // 256 bits
    const token = bytes.toString('hex'); // 64 characters hex
    return new VerificationToken(token);
  }

  /**
   * Create token from existing value
   */
  public static from(value: string): VerificationToken {
    return new VerificationToken(value);
  }

  /**
   * Check if token is secure enough
   */
  public isSecure(): boolean {
    return this.value.length >= 64; // At least 256 bits
  }

  /**
   * Get masked version for logging
   */
  public getMasked(): string {
    if (this.value.length <= 8) {
      return '***';
    }
    return this.value.slice(0, 4) + '***' + this.value.slice(-4);
  }
}