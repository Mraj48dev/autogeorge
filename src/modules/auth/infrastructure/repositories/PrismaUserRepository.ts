import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../domain/ports/UserRepository';
import { User, UserMetadata } from '../../domain/entities/User';
import { UserId } from '../../domain/value-objects/UserId';
import { UserEmail } from '../../domain/value-objects/UserEmail';
import { UserName } from '../../domain/value-objects/UserName';
import { UserRole } from '../../domain/value-objects/UserRole';
import { UserStatus } from '../../domain/value-objects/UserStatus';

/**
 * Prisma implementation of UserRepository
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const userData = {
      id: user.id.getValue(),
      email: user.email.getValue(),
      name: user.name.getValue(),
      role: user.role.getValue(),
      status: user.status.getValue(),
      externalAuthProviderId: user.externalAuthProviderId,
      externalAuthProvider: user.externalAuthProvider,
      profileImageUrl: user.profileImageUrl,
      lastLoginAt: user.lastLoginAt,
      metadata: user.metadata ? JSON.stringify(user.metadata) : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await this.prisma.user.upsert({
      where: { id: user.id.getValue() },
      create: userData,
      update: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status,
        profileImageUrl: userData.profileImageUrl,
        lastLoginAt: userData.lastLoginAt,
        metadata: userData.metadata,
        updatedAt: userData.updatedAt,
      },
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { id: id.getValue() },
    });

    if (!userData) {
      return null;
    }

    return this.mapToUser(userData);
  }

  async findByEmail(email: UserEmail): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { email: email.getValue() },
    });

    if (!userData) {
      return null;
    }

    return this.mapToUser(userData);
  }

  async findByExternalAuthProviderId(externalId: string): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { externalAuthProviderId: externalId },
    });

    if (!userData) {
      return null;
    }

    return this.mapToUser(userData);
  }

  async findAll(limit?: number, offset?: number): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(userData => this.mapToUser(userData));
  }

  async count(): Promise<number> {
    return await this.prisma.user.count();
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id: id.getValue() },
    });
  }

  async emailExists(email: UserEmail): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.getValue() },
    });
    return count > 0;
  }

  async externalAuthProviderIdExists(externalId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { externalAuthProviderId: externalId },
    });
    return count > 0;
  }

  private mapToUser(userData: any): User {
    let metadata: UserMetadata | undefined;
    if (userData.metadata) {
      try {
        metadata = JSON.parse(userData.metadata);
      } catch (error) {
        // Invalid JSON, ignore metadata
        metadata = undefined;
      }
    }

    return new User(
      UserId.fromString(userData.id),
      UserEmail.fromString(userData.email),
      UserName.fromString(userData.name),
      userData.externalAuthProviderId,
      UserRole.fromString(userData.role),
      UserStatus.fromString(userData.status),
      userData.externalAuthProvider,
      userData.profileImageUrl,
      userData.lastLoginAt,
      metadata,
      userData.createdAt,
      userData.updatedAt
    );
  }
}