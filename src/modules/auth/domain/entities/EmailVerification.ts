import { Entity } from '@/shared/domain/base/Entity';
import { Email } from '../value-objects/Email';
import { VerificationToken } from '../value-objects/VerificationToken';
import { VerificationStatus } from '../value-objects/VerificationStatus';
import { EmailVerificationExpired } from '../events/EmailVerificationExpired';
import { EmailVerified } from '../events/EmailVerified';

interface EmailVerificationProps {
  email: Email;
  token: VerificationToken;
  status: VerificationStatus;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EmailVerification Entity
 * Represents a pending or completed email verification
 */
export class EmailVerification extends Entity<EmailVerificationProps> {
  private constructor(props: EmailVerificationProps, id?: string) {
    super(props, id);
  }

  public static create(props: {
    email: Email;
    token: VerificationToken;
    expiresAt?: Date;
  }, id?: string): EmailVerification {
    const now = new Date();
    const expiresAt = props.expiresAt || new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const verification = new EmailVerification({
      email: props.email,
      token: props.token,
      status: VerificationStatus.pending(),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    }, id);

    return verification;
  }

  public get email(): Email {
    return this.props.email;
  }

  public get token(): VerificationToken {
    return this.props.token;
  }

  public get status(): VerificationStatus {
    return this.props.status;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get verifiedAt(): Date | undefined {
    return this.props.verifiedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public isPending(): boolean {
    return this.props.status.isPending();
  }

  public isVerified(): boolean {
    return this.props.status.isVerified();
  }

  public isExpiredStatus(): boolean {
    return this.props.status.isExpired();
  }

  public verify(): void {
    if (this.isExpired()) {
      this.markAsExpired();
      return;
    }

    if (!this.isPending()) {
      throw new Error('Email verification is not pending');
    }

    const now = new Date();
    this.props.status = VerificationStatus.verified();
    this.props.verifiedAt = now;
    this.props.updatedAt = now;

    // Domain event
    this.addDomainEvent(new EmailVerified({
      verificationId: this.id,
      email: this.props.email.value,
      verifiedAt: now,
    }));
  }

  public markAsExpired(): void {
    const now = new Date();
    this.props.status = VerificationStatus.expired();
    this.props.updatedAt = now;

    // Domain event
    this.addDomainEvent(new EmailVerificationExpired({
      verificationId: this.id,
      email: this.props.email.value,
      expiredAt: now,
    }));
  }

  public regenerateToken(newToken: VerificationToken, expiresAt?: Date): void {
    if (this.isVerified()) {
      throw new Error('Cannot regenerate token for verified email');
    }

    const now = new Date();
    const newExpiresAt = expiresAt || new Date(now.getTime() + 24 * 60 * 60 * 1000);

    this.props.token = newToken;
    this.props.status = VerificationStatus.pending();
    this.props.expiresAt = newExpiresAt;
    this.props.updatedAt = now;
  }

  public toSnapshot(): any {
    return {
      id: this.id,
      email: this.props.email.value,
      token: this.props.token.value,
      status: this.props.status.value,
      expiresAt: this.props.expiresAt.toISOString(),
      verifiedAt: this.props.verifiedAt?.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}