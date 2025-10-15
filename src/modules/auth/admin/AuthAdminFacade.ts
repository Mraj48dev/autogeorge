import { Result } from '../../sources/shared/domain/types/Result';
import { AuthenticateUser, AuthenticateUserRequest, AuthenticateUserResponse } from '../application/use-cases/AuthenticateUser';
import { GetCurrentUser, GetCurrentUserRequest, GetCurrentUserResponse } from '../application/use-cases/GetCurrentUser';
import { UserRepository } from '../domain/ports/UserRepository';
import { User } from '../domain/entities/User';

/**
 * Admin facade for Auth module
 * Provides high-level operations for authentication management
 */
export class AuthAdminFacade {
  constructor(
    private readonly authenticateUser: AuthenticateUser,
    private readonly getCurrentUser: GetCurrentUser,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Authenticates the current user via Clerk
   */
  async authenticateUser(request: AuthenticateUserRequest = {}): Promise<Result<AuthenticateUserResponse, Error>> {
    return await this.authenticateUser.execute(request);
  }

  /**
   * Gets the current authenticated user
   */
  async getCurrentUser(request: GetCurrentUserRequest = {}): Promise<Result<GetCurrentUserResponse, Error>> {
    return await this.getCurrentUser.execute(request);
  }

  /**
   * Gets all users with pagination
   */
  async getAllUsers(limit?: number, offset?: number): Promise<Result<User[], Error>> {
    try {
      const users = await this.userRepository.findAll(limit, offset);
      return Result.success(users);
    } catch (error) {
      return Result.failure(new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Gets user count
   */
  async getUserCount(): Promise<Result<number, Error>> {
    try {
      const count = await this.userRepository.count();
      return Result.success(count);
    } catch (error) {
      return Result.failure(new Error(`Failed to get user count: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Health check for auth module
   */
  async healthCheck(): Promise<Result<AuthHealthCheck, Error>> {
    try {
      // Check database connectivity
      const userCount = await this.userRepository.count();

      return Result.success({
        status: 'healthy',
        userCount,
        timestamp: new Date(),
        version: '1.0.0'
      });
    } catch (error) {
      return Result.failure(new Error(`Auth module health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

export interface AuthHealthCheck {
  status: 'healthy' | 'unhealthy';
  userCount: number;
  timestamp: Date;
  version: string;
}