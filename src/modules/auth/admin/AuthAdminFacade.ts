import { Result } from '../../sources/shared/domain/types/Result';
import { GetUsers, GetUsersRequest, GetUsersResponse } from '../application/use-cases/GetUsers';
import { UpdateUserRole, UpdateUserRoleRequest, UpdateUserRoleResponse } from '../application/use-cases/UpdateUserRole';
import { CheckPermissions, CheckPermissionsRequest, CheckPermissionsResponse } from '../application/use-cases/CheckPermissions';

/**
 * Admin facade for Auth module
 * Provides a simplified interface for admin operations
 */
export class AuthAdminFacade {
  constructor(
    private readonly getUsersUseCase: GetUsers,
    private readonly updateUserRoleUseCase: UpdateUserRole,
    private readonly checkPermissionsUseCase: CheckPermissions
  ) {}

  /**
   * Gets users with pagination and filtering
   */
  async getUsers(request: GetUsersRequest): Promise<Result<GetUsersResponse, Error>> {
    return await this.getUsersUseCase.execute(request);
  }

  /**
   * Updates a user's role
   */
  async updateUserRole(request: UpdateUserRoleRequest): Promise<Result<UpdateUserRoleResponse, Error>> {
    return await this.updateUserRoleUseCase.execute(request);
  }

  /**
   * Checks if current user has required permissions
   */
  async checkPermissions(request: CheckPermissionsRequest): Promise<Result<CheckPermissionsResponse, Error>> {
    return await this.checkPermissionsUseCase.execute(request);
  }

  /**
   * CLI Commands for auth management
   */
  async executeCliCommand(command: string, args: string[]): Promise<Result<string, Error>> {
    try {
      switch (command) {
        case 'list-users':
          return await this.cliListUsers(args);

        case 'promote-user':
          return await this.cliPromoteUser(args);

        case 'check-permissions':
          return await this.cliCheckPermissions(args);

        default:
          return Result.failure(new Error(`Unknown command: ${command}`));
      }
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error('CLI command failed'));
    }
  }

  private async cliListUsers(args: string[]): Promise<Result<string, Error>> {
    const page = args.length > 0 ? parseInt(args[0]) : 1;
    const limit = args.length > 1 ? parseInt(args[1]) : 10;

    const result = await this.getUsers({ page, limit });

    if (result.isFailure()) {
      return Result.failure(result.error);
    }

    const response = result.value;
    const output = [
      `Found ${response.pagination.total} users (page ${response.pagination.page}/${response.pagination.totalPages}):`,
      '',
      ...response.users.map((user: any) =>
        `${user.id} | ${user.email} | ${user.role} | ${user.name || 'N/A'}`
      ),
      '',
      `Total: ${response.pagination.total} users`
    ].join('\n');

    return Result.success(output);
  }

  private async cliPromoteUser(args: string[]): Promise<Result<string, Error>> {
    if (args.length < 2) {
      return Result.failure(new Error('Usage: promote-user <user-id> <new-role>'));
    }

    const [userId, newRole] = args;

    const result = await this.updateUserRole({
      userId,
      newRole: newRole as any
    });

    if (result.isFailure()) {
      return Result.failure(result.error);
    }

    return Result.success(`User ${userId} role updated to ${newRole}`);
  }

  private async cliCheckPermissions(args: string[]): Promise<Result<string, Error>> {
    if (args.length < 1) {
      return Result.failure(new Error('Usage: check-permissions <required-role>'));
    }

    const requiredRole = args[0];

    const result = await this.checkPermissions({
      requiredRole: requiredRole as any
    });

    if (result.isFailure()) {
      return Result.failure(result.error);
    }

    const response = result.value;
    const output = [
      `Permission Check Results:`,
      `Required Role: ${requiredRole}`,
      `Has Permission: ${response.hasPermission}`,
      `Current User: ${response.user?.email || 'Not authenticated'}`,
      `Current Role: ${response.user?.role || 'N/A'}`,
      `Reason: ${response.reason}`
    ].join('\n');

    return Result.success(output);
  }

  /**
   * HTTP endpoint handlers
   */
  async handleHttpRequest(method: string, path: string, body?: any): Promise<Result<any, Error>> {
    try {
      switch (`${method} ${path}`) {
        case 'GET /users':
          return await this.getUsers(body || {});

        case 'PUT /users/role':
          return await this.updateUserRole(body);

        case 'POST /permissions/check':
          return await this.checkPermissions(body);

        default:
          return Result.failure(new Error(`Unknown endpoint: ${method} ${path}`));
      }
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error('HTTP request failed'));
    }
  }
}