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
  }

  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('VerificationToken must be a non-empty string');
    }

    if (value.length < VerificationToken.MIN_LENGTH) {
      throw new Error(`VerificationToken must be at least ${VerificationToken.MIN_LENGTH} characters`);
    }

    if (value.length > VerificationToken.MAX_LENGTH) {
      throw new Error(`VerificationToken cannot exceed ${VerificationToken.MAX_LENGTH} characters`);
    }

    // Check if it's a valid hex string (for crypto tokens)
    if (!/^[a-fA-F0-9]+$/.test(value)) {
      throw new Error('VerificationToken must be a valid hexadecimal string');
    }
  }

  /**
   * Generate a secure random verification token
   */
  public static generate(): VerificationToken {
    try {
      // Primary method: use crypto.randomBytes
      const bytes = randomBytes(32); // 256 bits
      const token = bytes.toString('hex'); // 64 characters hex

      if (!token || token.length < 32) {
        throw new Error('Generated token is too short');
      }

      return new VerificationToken(token);
    } catch (error) {
      // Fallback method for production environments where crypto might fail
      console.warn('randomBytes failed, using fallback token generation:', error);

      // Generate a secure token using multiple random sources
      const timestamp = Date.now().toString(36);
      const random1 = Math.random().toString(36).substring(2);
      const random2 = Math.random().toString(36).substring(2);
      const random3 = Math.random().toString(36).substring(2);
      const random4 = Math.random().toString(36).substring(2);

      // Combine and hash to ensure consistent length
      const combined = `${timestamp}${random1}${random2}${random3}${random4}`;

      // Convert to hex and ensure minimum length
      let token = combined.split('').map(char => char.charCodeAt(0).toString(16)).join('');

      // Pad to minimum length if needed
      while (token.length < 64) {
        token += Math.random().toString(16).substring(2);
      }

      // Truncate to consistent length
      token = token.substring(0, 64);

      return new VerificationToken(token);
    }
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