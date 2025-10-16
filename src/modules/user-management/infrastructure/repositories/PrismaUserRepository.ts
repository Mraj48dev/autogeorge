import { PrismaClient } from '@prisma/client';
import { Result } from '@/shared/domain/types/Result';
import { UserRepository } from '../../domain/ports/UserRepository';
import { User } from '../../domain/entities/User';
import { UserId } from '../../domain/value-objects/UserId';
import { UserRole, UserRoleType } from '../../domain/value-objects/UserRole';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: UserId): Promise<Result<User | null>> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: id.value },
        include: {
          userPermissions: true
        }
      });

      if (!userData) {
        return Result.success(null);
      }

      return this.mapToUser(userData);
    } catch (error) {
      return Result.failure(`Failed to find user by ID: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { email },
        include: {
          userPermissions: true
        }
      });

      if (!userData) {
        return Result.success(null);
      }

      return this.mapToUser(userData);
    } catch (error) {
      return Result.failure(`Failed to find user by email: ${error}`);
    }
  }

  async findByClerkUserId(clerkUserId: string): Promise<Result<User | null>> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { clerkUserId },
        include: {
          userPermissions: true
        }
      });

      if (!userData) {
        return Result.success(null);
      }

      return this.mapToUser(userData);
    } catch (error) {
      return Result.failure(`Failed to find user by Clerk ID: ${error}`);
    }
  }

  async findAll(filters?: {
    organizationId?: string;
    role?: UserRole;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Result<User[]>> {
    try {
      const where: any = {};

      if (filters?.organizationId) {
        where.organizationId = filters.organizationId;
      }

      if (filters?.role) {
        where.role = filters.role.value;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const usersData = await this.prisma.user.findMany({
        where,
        include: {
          userPermissions: true
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit,
        skip: filters?.offset
      });

      const users: User[] = [];
      for (const userData of usersData) {
        const userResult = this.mapToUser(userData);
        if (userResult.isSuccess()) {
          users.push(userResult.value);
        }
      }

      return Result.success(users);
    } catch (error) {
      return Result.failure(`Failed to find all users: ${error}`);
    }
  }

  async save(user: User): Promise<Result<User>> {
    try {
      const userData = await this.prisma.user.upsert({
        where: { id: user.id.value },
        update: {
          email: user.email,
          clerkUserId: user.clerkUserId,
          role: user.role.value,
          organizationId: user.organizationId,
          isActive: user.isActive,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt
        },
        create: {
          id: user.id.value,
          email: user.email,
          clerkUserId: user.clerkUserId,
          role: user.role.value,
          organizationId: user.organizationId,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt
        },
        include: {
          userPermissions: true
        }
      });

      // Update permissions
      if (user.permissions.length > 0) {
        // Delete existing permissions
        await this.prisma.userPermission.deleteMany({
          where: { userId: user.id.value }
        });

        // Create new permissions
        await this.prisma.userPermission.createMany({
          data: user.permissions.map(permission => ({
            userId: user.id.value,
            permission
          }))
        });
      }

      return this.mapToUser({
        ...userData,
        userPermissions: user.permissions.map(permission => ({
          id: `perm_${Date.now()}`,
          userId: user.id.value,
          permission,
          resource: null
        }))
      });
    } catch (error) {
      return Result.failure(`Failed to save user: ${error}`);
    }
  }

  async delete(id: UserId): Promise<Result<void>> {
    try {
      // Delete user permissions first
      await this.prisma.userPermission.deleteMany({
        where: { userId: id.value }
      });

      // Delete user
      await this.prisma.user.delete({
        where: { id: id.value }
      });

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(`Failed to delete user: ${error}`);
    }
  }

  async emailExists(email: string): Promise<Result<boolean>> {
    try {
      const count = await this.prisma.user.count({
        where: { email }
      });

      return Result.success(count > 0);
    } catch (error) {
      return Result.failure(`Failed to check email existence: ${error}`);
    }
  }

  async count(filters?: {
    organizationId?: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<Result<number>> {
    try {
      const where: any = {};

      if (filters?.organizationId) {
        where.organizationId = filters.organizationId;
      }

      if (filters?.role) {
        where.role = filters.role.value;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const count = await this.prisma.user.count({ where });
      return Result.success(count);
    } catch (error) {
      return Result.failure(`Failed to count users: ${error}`);
    }
  }

  async findByOrganization(organizationId: string): Promise<Result<User[]>> {
    return this.findAll({ organizationId });
  }

  private mapToUser(userData: any): Result<User> {
    try {
      const userIdResult = UserId.create(userData.id);
      if (userIdResult.isFailure()) {
        return Result.failure(`Invalid user ID: ${userIdResult.error}`);
      }

      const roleResult = UserRole.create(userData.role);
      if (roleResult.isFailure()) {
        return Result.failure(`Invalid user role: ${roleResult.error}`);
      }

      const permissions = userData.userPermissions?.map((p: any) => p.permission) || [];

      const user = new User({
        id: userIdResult.value,
        email: userData.email,
        clerkUserId: userData.clerkUserId,
        role: roleResult.value,
        organizationId: userData.organizationId,
        isActive: userData.isActive,
        permissions,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: userData.lastLoginAt
      });

      return Result.success(user);
    } catch (error) {
      return Result.failure(`Failed to map user data: ${error}`);
    }
  }
}