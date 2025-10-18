import { AuthAdminFacade } from '@/modules/auth/admin/AuthAdminFacade';
import { GetUsers } from '@/modules/auth/application/use-cases/GetUsers';
import { UpdateUserRole } from '@/modules/auth/application/use-cases/UpdateUserRole';
import { CheckPermissions } from '@/modules/auth/application/use-cases/CheckPermissions';
import { PrismaUserRepository } from '@/modules/auth/infrastructure/prisma-user-repository';
import { ClerkAuthService } from '@/modules/auth/infrastructure/clerk-auth-service';

/**
 * Auth module container for dependency injection
 */
export interface AuthContainer {
  authAdminFacade: AuthAdminFacade;
  userRepository: PrismaUserRepository;
  authService: ClerkAuthService;
}

/**
 * Creates and configures the auth container
 */
export function createAuthContainer(): AuthContainer {
  // Infrastructure
  const userRepository = new PrismaUserRepository();
  const authService = new ClerkAuthService();

  // Use Cases
  const getUsersUseCase = new GetUsers(userRepository);
  const updateUserRoleUseCase = new UpdateUserRole(userRepository, authService);
  const checkPermissionsUseCase = new CheckPermissions(authService);

  // Admin Facade
  const authAdminFacade = new AuthAdminFacade(
    getUsersUseCase,
    updateUserRoleUseCase,
    checkPermissionsUseCase
  );

  return {
    authAdminFacade,
    userRepository,
    authService
  };
}