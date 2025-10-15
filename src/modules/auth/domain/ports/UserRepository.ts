import { User } from '../entities/User';
import { UserId } from '../value-objects/UserId';
import { UserEmail } from '../value-objects/UserEmail';

/**
 * User repository port - defines contract for user persistence
 */
export interface UserRepository {
  /**
   * Saves a user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Finds a user by ID
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Finds a user by email
   */
  findByEmail(email: UserEmail): Promise<User | null>;

  /**
   * Finds a user by external auth provider ID (Clerk ID)
   */
  findByExternalAuthProviderId(externalId: string): Promise<User | null>;

  /**
   * Gets all users with optional pagination
   */
  findAll(limit?: number, offset?: number): Promise<User[]>;

  /**
   * Counts total users
   */
  count(): Promise<number>;

  /**
   * Deletes a user
   */
  delete(id: UserId): Promise<void>;

  /**
   * Checks if email exists
   */
  emailExists(email: UserEmail): Promise<boolean>;

  /**
   * Checks if external auth provider ID exists
   */
  externalAuthProviderIdExists(externalId: string): Promise<boolean>;
}