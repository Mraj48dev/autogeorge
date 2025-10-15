import { EmailVerification } from '../../domain/entities/EmailVerification';
import { EmailVerificationRepository } from '../../domain/ports/EmailVerificationRepository';
import { Email } from '../../domain/value-objects/Email';
import { VerificationToken } from '../../domain/value-objects/VerificationToken';
import { VerificationStatus } from '../../domain/value-objects/VerificationStatus';
import { prisma } from '@/shared/database/prisma';

/**
 * Prisma EmailVerification Repository
 * Infrastructure implementation of EmailVerificationRepository
 */
export class PrismaEmailVerificationRepository implements EmailVerificationRepository {
  async save(verification: EmailVerification): Promise<void> {
    const data = {
      email: verification.email.value,
      token: verification.token.value,
      status: verification.status.value,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      updatedAt: new Date(),
    };

    await prisma.emailVerification.upsert({
      where: { id: verification.id },
      update: data,
      create: {
        id: verification.id,
        ...data,
      },
    });
  }

  async findByToken(token: VerificationToken): Promise<EmailVerification | null> {
    const record = await prisma.emailVerification.findUnique({
      where: { token: token.value },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: Email): Promise<EmailVerification | null> {
    const record = await prisma.emailVerification.findFirst({
      where: { email: email.value },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<EmailVerification | null> {
    const record = await prisma.emailVerification.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findPendingByEmail(email: Email): Promise<EmailVerification | null> {
    const record = await prisma.emailVerification.findFirst({
      where: {
        email: email.value,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    await prisma.emailVerification.delete({
      where: { id },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.emailVerification.deleteMany({
      where: {
        OR: [
          {
            status: 'expired',
          },
          {
            status: 'pending',
            expiresAt: {
              lt: new Date(),
            },
          },
        ],
      },
    });

    return result.count;
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    verified: number;
    expired: number;
  }> {
    const [total, pending, verified, expired] = await Promise.all([
      prisma.emailVerification.count(),
      prisma.emailVerification.count({
        where: { status: 'pending' },
      }),
      prisma.emailVerification.count({
        where: { status: 'verified' },
      }),
      prisma.emailVerification.count({
        where: { status: 'expired' },
      }),
    ]);

    return {
      total,
      pending,
      verified,
      expired,
    };
  }

  private toDomain(record: any): EmailVerification {
    const props = {
      email: new Email(record.email),
      token: new VerificationToken(record.token),
      status: VerificationStatus.from(record.status),
      expiresAt: record.expiresAt,
      verifiedAt: record.verifiedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return EmailVerification.create(props, record.id);
  }
}