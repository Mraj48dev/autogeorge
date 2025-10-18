import { Result } from '../../../sources/shared/domain/types/Result';
import { BaseUseCase } from '../../../sources/shared/application/base/UseCase';
import { AuthService } from '../../domain/auth-service.interface';
import { UserRole, UserEntity } from '../../domain/user.entity';

/**
 * Use case for checking user permissions
 */
export class CheckPermissions extends BaseUseCase<CheckPermissionsRequest, CheckPermissionsResponse> {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async execute(request: CheckPermissionsRequest): Promise<Result<CheckPermissionsResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateCheckPermissionsRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Get current user
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        return Result.success({
          hasPermission: false,
          user: null,
          reason: 'User not authenticated'
        });
      }

      // Check if user has required role
      const hasPermission = this.checkRolePermission(currentUser.role, request.requiredRole);

      return Result.success({
        hasPermission,
        user: currentUser,
        reason: hasPermission ? 'Permission granted' : `Requires ${request.requiredRole} role or higher`
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to check permissions'));
    }
  }

  private validateCheckPermissionsRequest(request: CheckPermissionsRequest): Result<void, Error> {
    if (!request.requiredRole) {
      return Result.failure(new Error('Required role is required'));
    }

    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(request.requiredRole)) {
      return Result.failure(new Error(`Invalid role. Valid roles: ${validRoles.join(', ')}`));
    }

    return Result.success(undefined);
  }

  private checkRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
    // Role hierarchy: ADMIN > EDITOR > VIEWER
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.EDITOR]: 1,
      [UserRole.ADMIN]: 2
    };

    const userLevel = roleHierarchy[userRole];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  }
}

// Request interface
export interface CheckPermissionsRequest {
  requiredRole: UserRole;
  resource?: string; // Optional resource identifier for future use
  action?: string;   // Optional action identifier for future use
}

// Response interface
export interface CheckPermissionsResponse {
  hasPermission: boolean;
  user: UserEntity | null;
  reason: string;
}