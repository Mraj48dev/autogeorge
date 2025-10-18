import { Result } from '../../../sources/shared/domain/types/Result';
import { UserEntity, UserRole } from '../user.entity';

/**
 * Port for user data persistence
 */
export interface UserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<Result<UserEntity | null, Error>>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<Result<UserEntity | null, Error>>;

  /**
   * Find users with pagination and filtering
   */
  findSummaries(options: FindUsersOptions): Promise<Result<UserSummaryPage, Error>>;

  /**
   * Create or update user
   */
  save(user: UserEntity): Promise<Result<UserEntity, Error>>;

  /**
   * Update existing user
   */
  update(user: UserEntity): Promise<Result<UserEntity, Error>>;

  /**
   * Delete user by ID
   */
  deleteById(id: string): Promise<Result<boolean, Error>>;

  /**
   * Get user count by role
   */
  countByRole(role: UserRole): Promise<Result<number, Error>>;

  /**
   * Update user last sign in time
   */
  updateLastSignIn(id: string): Promise<Result<void, Error>>;
}

/**
 * Options for finding users
 */
export interface FindUsersOptions {
  page: number;
  limit: number;
  sortBy: 'email' | 'name' | 'role' | 'createdAt' | 'lastSignInAt';
  sortOrder: 'asc' | 'desc';
  role?: UserRole;
  email?: string;
  search?: string;
}

/**
 * User summary for list views
 */
export interface UserSummary {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
  lastSignInAt?: Date;
  isActive: boolean;
}

/**
 * Paginated user summaries result
 */
export interface UserSummaryPage {
  users: UserSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}