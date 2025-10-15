import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/User';
import { UserId } from '../../domain/value-objects/UserId';
import { Email } from '../../domain/value-objects/Email';
import { Role } from '../../domain/value-objects/Role';
import { Permission } from '../../domain/value-objects/Permission';
import { IUserRepository } from '../../application/use-cases/AuthenticateUser';

/**
 * Prisma implementation of User Repository
 * Maps between domain entities and Prisma models
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: UserId): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { id: userId.getValue() },
    });

    if (!prismaUser) {
      return null;
    }

    return this.toDomainEntity(prismaUser);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email: email.getValue() },
    });

    if (!prismaUser) {
      return null;
    }

    return this.toDomainEntity(prismaUser);
  }

  async save(user: User): Promise<void> {
    const prismaData = this.toPrismaModel(user);

    await this.prisma.user.upsert({
      where: { id: user.id.getValue() },
      update: {
        name: prismaData.name,
        email: prismaData.email,
        emailVerified: prismaData.emailVerified,
        image: prismaData.image,
        updatedAt: new Date(),
      },
      create: {
        id: prismaData.id,
        name: prismaData.name,
        email: prismaData.email,
        emailVerified: prismaData.emailVerified,
        image: prismaData.image,
        provider: 'credentials',
        createdAt: prismaData.createdAt || new Date(),
        updatedAt: new Date(),
      },
    });

    // Save user metadata (role, permissions, etc.) in a separate table
    // For now, we'll store this in a JSON field or separate UserMetadata table
    await this.saveUserMetadata(user);
  }

  async findAll(): Promise<User[]> {
    const prismaUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      prismaUsers.map(prismaUser => this.toDomainEntity(prismaUser))
    );
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async deactivateUser(userId: UserId): Promise<void> {
    // We'll store user status in metadata
    const user = await this.findById(userId);
    if (user) {
      user.deactivate();
      await this.save(user);
    }
  }

  /**
   * Converts Prisma User model to Domain User entity
   */
  private async toDomainEntity(prismaUser: PrismaUser): Promise<User> {
    // Load user metadata (role, permissions, status)
    const metadata = await this.loadUserMetadata(prismaUser.id);

    const user = User.fromData({
      id: UserId.create(prismaUser.id),
      email: Email.create(prismaUser.email),
      name: prismaUser.name || undefined,
      image: prismaUser.image || undefined,
      role: metadata.role || Role.viewer(),
      permissions: metadata.permissions || [],
      isActive: metadata.isActive ?? true,
      emailVerified: prismaUser.emailVerified || undefined,
      lastLoginAt: metadata.lastLoginAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });

    return user;
  }

  /**
   * Converts Domain User entity to Prisma User model data
   */
  private toPrismaModel(user: User): any {
    return {
      id: user.id.getValue(),
      name: user.name,
      email: user.email.getValue(),
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Loads user metadata (role, permissions, status)
   * Simplified version - returns defaults for now
   */
  private async loadUserMetadata(userId: string): Promise<{
    role?: Role;
    permissions?: Permission[];
    isActive?: boolean;
    lastLoginAt?: Date;
  }> {
    // Return sensible defaults for now
    // TODO: Implement proper metadata storage when needed

    const defaultRole = Role.viewer();
    const defaultPermissions = this.getDefaultPermissionsForRole(defaultRole);

    return {
      role: defaultRole,
      permissions: defaultPermissions,
      isActive: true,
      lastLoginAt: undefined,
    };
  }

  /**
   * Returns default permissions for a role
   */
  private getDefaultPermissionsForRole(role: Role): Permission[] {
    if (role.isAdmin()) {
      return [Permission.create('system:admin')];
    }

    if (role.isEditor()) {
      return [
        Permission.create('source:create'),
        Permission.create('source:read'),
        Permission.create('source:update'),
        Permission.create('content:create'),
        Permission.create('content:read'),
        Permission.create('content:generate'),
      ];
    }

    if (role.isViewer()) {
      return [
        Permission.create('source:read'),
        Permission.create('content:read'),
      ];
    }

    return [];
  }

  /**
   * Saves user metadata (role, permissions, status)
   * Simplified version - just logs for now
   */
  private async saveUserMetadata(user: User): Promise<void> {
    // For now, just log the metadata we would save
    // TODO: Implement proper metadata storage when user metadata table is created

    console.log(`User metadata for ${user.id.getValue()}:`, {
      role: user.role.getValue(),
      permissions: user.permissions.length,
      isActive: user.isActive,
    });

    // Don't throw any errors - this is supplementary data
  }
}