import { Result } from '../../sources/shared/domain/types/Result';
import { UserRepository, FindUsersOptions, UserSummaryPage, UserSummary } from '../domain/ports/UserRepository';
import { UserEntity, UserRole } from '../domain/user.entity';
import { prisma } from '@/shared/database/prisma';

/**
 * Prisma implementation of UserRepository
 */
export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<Result<UserEntity | null, Error>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return Result.success(null);
      }

      const userEntity = this.mapToEntity(user);
      return Result.success(userEntity);

    } catch (error) {
      return Result.failure(new Error(`Failed to find user by ID: ${error}`));
    }
  }

  async findByEmail(email: string): Promise<Result<UserEntity | null, Error>> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return Result.success(null);
      }

      const userEntity = this.mapToEntity(user);
      return Result.success(userEntity);

    } catch (error) {
      return Result.failure(new Error(`Failed to find user by email: ${error}`));
    }
  }

  async findSummaries(options: FindUsersOptions): Promise<Result<UserSummaryPage, Error>> {
    try {
      const where: any = {};

      // Apply filters
      if (options.role) {
        where.role = options.role;
      }

      if (options.email) {
        where.email = {
          contains: options.email,
          mode: 'insensitive'
        };
      }

      if (options.search) {
        where.OR = [
          { email: { contains: options.search, mode: 'insensitive' } },
          { name: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      // Calculate pagination
      const skip = (options.page - 1) * options.limit;

      // Build orderBy
      const orderBy: any = {};
      orderBy[options.sortBy] = options.sortOrder;

      // Get total count
      const total = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        skip,
        take: options.limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastSignInAt: true,
          isActive: true
        }
      });

      const summaries: UserSummary[] = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role as UserRole,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt || undefined,
        isActive: user.isActive
      }));

      const totalPages = Math.ceil(total / options.limit);

      return Result.success({
        users: summaries,
        page: options.page,
        limit: options.limit,
        total,
        totalPages
      });

    } catch (error) {
      return Result.failure(new Error(`Failed to find user summaries: ${error}`));
    }
  }

  async save(user: UserEntity): Promise<Result<UserEntity, Error>> {
    try {
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        isActive: true
      };

      const savedUser = await prisma.user.upsert({
        where: { id: user.id },
        update: userData,
        create: userData
      });

      const userEntity = this.mapToEntity(savedUser);
      return Result.success(userEntity);

    } catch (error) {
      return Result.failure(new Error(`Failed to save user: ${error}`));
    }
  }

  async update(user: UserEntity): Promise<Result<UserEntity, Error>> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          lastSignInAt: user.lastSignInAt
        }
      });

      const userEntity = this.mapToEntity(updatedUser);
      return Result.success(userEntity);

    } catch (error) {
      return Result.failure(new Error(`Failed to update user: ${error}`));
    }
  }

  async deleteById(id: string): Promise<Result<boolean, Error>> {
    try {
      await prisma.user.delete({
        where: { id }
      });

      return Result.success(true);

    } catch (error) {
      return Result.failure(new Error(`Failed to delete user: ${error}`));
    }
  }

  async countByRole(role: UserRole): Promise<Result<number, Error>> {
    try {
      const count = await prisma.user.count({
        where: { role }
      });

      return Result.success(count);

    } catch (error) {
      return Result.failure(new Error(`Failed to count users by role: ${error}`));
    }
  }

  async updateLastSignIn(id: string): Promise<Result<void, Error>> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          lastSignInAt: new Date()
        }
      });

      return Result.success(undefined);

    } catch (error) {
      return Result.failure(new Error(`Failed to update last sign in: ${error}`));
    }
  }

  private mapToEntity(user: any): UserEntity {
    return new UserEntity(
      user.id,
      user.email,
      user.role as UserRole,
      user.name || undefined,
      user.createdAt,
      user.lastSignInAt || undefined
    );
  }
}