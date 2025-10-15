import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../domain/ports/UserRepository';
import { AuthService } from '../domain/ports/AuthService';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { ClerkAuthService } from './services/ClerkAuthService';
import { AuthenticateUser } from '../application/use-cases/AuthenticateUser';
import { GetCurrentUser } from '../application/use-cases/GetCurrentUser';
import { AuthAdminFacade } from '../admin/AuthAdminFacade';

/**
 * Dependency injection container for Auth module
 */
export class AuthContainer {
  private _userRepository?: UserRepository;
  private _authService?: AuthService;
  private _authenticateUser?: AuthenticateUser;
  private _getCurrentUser?: GetCurrentUser;
  private _authAdminFacade?: AuthAdminFacade;

  constructor(private readonly prisma: PrismaClient) {}

  get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new PrismaUserRepository(this.prisma);
    }
    return this._userRepository;
  }

  get authService(): AuthService {
    if (!this._authService) {
      this._authService = new ClerkAuthService();
    }
    return this._authService;
  }

  get authenticateUser(): AuthenticateUser {
    if (!this._authenticateUser) {
      this._authenticateUser = new AuthenticateUser(
        this.userRepository,
        this.authService
      );
    }
    return this._authenticateUser;
  }

  get getCurrentUser(): GetCurrentUser {
    if (!this._getCurrentUser) {
      this._getCurrentUser = new GetCurrentUser(
        this.userRepository,
        this.authService
      );
    }
    return this._getCurrentUser;
  }

  get authAdminFacade(): AuthAdminFacade {
    if (!this._authAdminFacade) {
      this._authAdminFacade = new AuthAdminFacade(
        this.authenticateUser,
        this.getCurrentUser,
        this.userRepository
      );
    }
    return this._authAdminFacade;
  }
}