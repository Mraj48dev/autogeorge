import { ValueObject } from '@/shared/domain/base/ValueObject';

type VerificationStatusType = 'pending' | 'verified' | 'expired';

/**
 * VerificationStatus Value Object
 * Represents the status of an email verification
 */
export class VerificationStatus extends ValueObject<VerificationStatusType> {
  private static readonly VALID_STATUSES: VerificationStatusType[] = ['pending', 'verified', 'expired'];

  constructor(value: VerificationStatusType) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('VerificationStatus must be a non-empty string');
    }

    if (!VerificationStatus.VALID_STATUSES.includes(this.value)) {
      throw new Error(`VerificationStatus must be one of: ${VerificationStatus.VALID_STATUSES.join(', ')}`);
    }
  }

  /**
   * Create pending status
   */
  public static pending(): VerificationStatus {
    return new VerificationStatus('pending');
  }

  /**
   * Create verified status
   */
  public static verified(): VerificationStatus {
    return new VerificationStatus('verified');
  }

  /**
   * Create expired status
   */
  public static expired(): VerificationStatus {
    return new VerificationStatus('expired');
  }

  /**
   * Create from string value
   */
  public static from(value: string): VerificationStatus {
    return new VerificationStatus(value as VerificationStatusType);
  }

  /**
   * Check if status is pending
   */
  public isPending(): boolean {
    return this.value === 'pending';
  }

  /**
   * Check if status is verified
   */
  public isVerified(): boolean {
    return this.value === 'verified';
  }

  /**
   * Check if status is expired
   */
  public isExpired(): boolean {
    return this.value === 'expired';
  }

  /**
   * Check if verification is still valid (not expired or already verified)
   */
  public isValid(): boolean {
    return this.isPending();
  }

  /**
   * Check if verification is final (verified or expired)
   */
  public isFinal(): boolean {
    return this.isVerified() || this.isExpired();
  }

  /**
   * Get display name for status
   */
  public getDisplayName(): string {
    const names = {
      'pending': 'In attesa di verifica',
      'verified': 'Verificato',
      'expired': 'Scaduto'
    };
    return names[this.value];
  }

  /**
   * Get CSS class for status display
   */
  public getCssClass(): string {
    const classes = {
      'pending': 'text-yellow-600 bg-yellow-50',
      'verified': 'text-green-600 bg-green-50',
      'expired': 'text-red-600 bg-red-50'
    };
    return classes[this.value];
  }
}