import { DomainEvent } from '@/shared/domain/base/DomainEvent';

interface EmailVerificationExpiredEventData {
  verificationId: string;
  email: string;
  expiredAt: Date;
}

/**
 * EmailVerificationExpired Domain Event
 * Fired when an email verification expires without being completed
 */
export class EmailVerificationExpired extends DomainEvent<EmailVerificationExpiredEventData> {
  constructor(data: EmailVerificationExpiredEventData) {
    super('EmailVerificationExpired', data, {
      aggregateId: data.verificationId,
      aggregateType: 'EmailVerification',
      version: 1,
    });
  }

  public get verificationId(): string {
    return this.data.verificationId;
  }

  public get email(): string {
    return this.data.email;
  }

  public get expiredAt(): Date {
    return this.data.expiredAt;
  }

  public static eventName(): string {
    return 'EmailVerificationExpired';
  }
}