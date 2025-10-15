import { DomainEvent } from '@/shared/domain/base/DomainEvent';

interface EmailVerificationSentEventData {
  verificationId: string;
  email: string;
  sentAt: Date;
  expiresAt: Date;
}

/**
 * EmailVerificationSent Domain Event
 * Fired when a verification email is sent to a user
 */
export class EmailVerificationSent extends DomainEvent<EmailVerificationSentEventData> {
  constructor(data: EmailVerificationSentEventData) {
    super('EmailVerificationSent', data, {
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

  public get sentAt(): Date {
    return this.data.sentAt;
  }

  public get expiresAt(): Date {
    return this.data.expiresAt;
  }

  public static eventName(): string {
    return 'EmailVerificationSent';
  }
}