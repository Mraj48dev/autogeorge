import { UseCase, ExecutionContext } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { Session } from '../../domain/entities/Session';
import { Email } from '../../domain/value-objects/Email';
import { UserId } from '../../domain/value-objects/UserId';

export interface AuthenticateUserInput {
  email: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthenticateUserOutput {
  user: User;
  session: Session;
  isNewUser: boolean;
}

export interface AuthError {
  code: 'USER_NOT_FOUND' | 'USER_INACTIVE' | 'INVALID_EMAIL' | 'SYSTEM_ERROR';
  message: string;
}

/**
 * Port (interface) for User Repository
 */
export interface IUserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}

/**
 * Port (interface) for Session Repository
 */
export interface ISessionRepository {
  save(session: Session): Promise<void>;
  findActiveByUserId(userId: UserId): Promise<Session[]>;
  invalidateUserSessions(userId: UserId): Promise<void>;
}

/**
 * Use Case: Authenticate User
 * Handles user authentication and session creation
 */
export class AuthenticateUser extends UseCase<
  AuthenticateUserInput,
  AuthenticateUserOutput,
  AuthError
> {
  constructor(
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository
  ) {
    super();
  }

  protected async validateInput(
    input: AuthenticateUserInput
  ): Promise<Result<AuthenticateUserInput, AuthError>> {
    try {
      // Validate email format
      Email.create(input.email);
      return Result.success(input);
    } catch (error) {
      return Result.failure({
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
      });
    }
  }

  protected async executeImpl(
    input: AuthenticateUserInput,
    context: ExecutionContext
  ): Promise<Result<AuthenticateUserOutput, AuthError>> {
    try {
      console.log('AuthenticateUser: Creating email from input:', input.email);
      const email = Email.create(input.email);
      console.log('AuthenticateUser: Email created successfully');

      // Find existing user
      console.log('AuthenticateUser: Searching for existing user');
      let user = await this.userRepository.findByEmail(email);
      let isNewUser = false;

      // Create new user if not found
      if (!user) {
        console.log('AuthenticateUser: User not found, creating new user');
        user = User.create({ email });
        console.log('AuthenticateUser: New user created, saving to repository');
        await this.userRepository.save(user);
        console.log('AuthenticateUser: User saved successfully');
        isNewUser = true;
      }

      // Check if user is active
      if (!user.isActive) {
        return Result.failure({
          code: 'USER_INACTIVE',
          message: 'User account is deactivated',
        });
      }

      // Record login
      console.log('AuthenticateUser: Recording login');
      user.recordLogin();
      await this.userRepository.save(user);

      // Create new session
      console.log('AuthenticateUser: Creating session');
      const sessionToken = this.generateSessionToken();
      const expires = this.getSessionExpiration();

      const session = Session.create({
        userId: user.id,
        sessionToken,
        expires,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      });

      console.log('AuthenticateUser: Saving session');
      await this.sessionRepository.save(session);

      console.log('AuthenticateUser: Success!');
      return Result.success({
        user,
        session,
        isNewUser,
      });
    } catch (error) {
      console.error('AuthenticateUser: Error occurred:', error);
      return Result.failure({
        code: 'SYSTEM_ERROR',
        message: 'Authentication failed due to system error',
      });
    }
  }

  /**
   * Generates a secure session token
   */
  private generateSessionToken(): string {
    // Generate a secure random token
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for Node.js
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculates session expiration date
   */
  private getSessionExpiration(): Date {
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    return new Date(now.getTime() + thirtyDays);
  }
}