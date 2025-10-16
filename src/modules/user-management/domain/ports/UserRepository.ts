import { Result } from '@/shared/domain/types/Result';
import { User } from '../entities/User';
import { UserId } from '../value-objects/UserId';
import { UserRole } from '../value-objects/UserRole';

export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(id: UserId): Promise<Result<User | null>>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<Result<User | null>>;

  /**
   * Find user by Clerk user ID
   */
  findByClerkUserId(clerkUserId: string): Promise<Result<User | null>>;

  /**
   * Get all users with optional filtering
   */
  findAll(filters?: {
    organizationId?: string;
    role?: UserRole;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Result<User[]>>;

  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<Result<User>>;

  /**
   * Delete a user
   */
  delete(id: UserId): Promise<Result<void>>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<Result<boolean>>;

  /**
   * Count users with optional filtering
   */
  count(filters?: {
    organizationId?: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<Result<number>>;

  /**
   * Get users by organization
   */
  findByOrganization(organizationId: string): Promise<Result<User[]>>;
}