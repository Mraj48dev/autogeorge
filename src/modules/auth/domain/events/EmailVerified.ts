import { DomainEvent } from '@/shared/domain/base/DomainEvent';

interface EmailVerifiedEventData {
  verificationId: string;
  email: string;
  verifiedAt: Date;
}

/**
 * EmailVerified Domain Event
 * Fired when an email verification is successfully completed
 */
export class EmailVerified extends DomainEvent<EmailVerifiedEventData> {
  constructor(data: EmailVerifiedEventData) {
    super('EmailVerified', data, {
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

  public get verifiedAt(): Date {
    return this.data.verifiedAt;
  }

  public static eventName(): string {
    return 'EmailVerified';
  }
}