import { UseCase } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { UserRole, UserRoleType } from '../../domain/value-objects/UserRole';
import { UserId } from '../../domain/value-objects/UserId';

export interface GetUsersRequest {
  requestedBy: string; // User ID making the request
  organizationId?: string;
  role?: UserRoleType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
  hasMore: boolean;
}

export class GetUsers extends UseCase<GetUsersRequest, GetUsersResponse> {
  constructor(
    private userRepository: UserRepository
  ) {
    super();
  }

  async execute(request: GetUsersRequest): Promise<Result<GetUsersResponse>> {
    try {
      // Validate requesting user
      const requestingUserIdResult = UserId.create(request.requestedBy);
      if (requestingUserIdResult.isFailure()) {
        return Result.failure(`Invalid requesting user ID: ${requestingUserIdResult.error}`);
      }

      // Find requesting user to check permissions
      const requestingUserResult = await this.userRepository.findById(requestingUserIdResult.value);
      if (requestingUserResult.isFailure()) {
        return Result.failure(`Failed to find requesting user: ${requestingUserResult.error}`);
      }

      if (!requestingUserResult.value) {
        return Result.failure('Requesting user not found');
      }

      const requestingUser = requestingUserResult.value;

      // Check if user can view users
      if (!requestingUser.hasPermission('users:view')) {
        return Result.failure('Insufficient permissions to view users');
      }

      // Build filters based on requesting user's permissions
      const filters: Parameters<UserRepository['findAll']>[0] = {
        limit: request.limit || 50,
        offset: request.offset || 0
      };

      // If requesting user is not super admin, filter by organization
      if (!requestingUser.role.isSuperAdmin()) {
        filters.organizationId = requestingUser.organizationId || request.organizationId;
      } else if (request.organizationId) {
        filters.organizationId = request.organizationId;
      }

      // Apply additional filters
      if (request.role) {
        const roleResult = UserRole.create(request.role);
        if (roleResult.isFailure()) {
          return Result.failure(`Invalid role filter: ${roleResult.error}`);
        }
        filters.role = roleResult.value;
      }

      if (request.isActive !== undefined) {
        filters.isActive = request.isActive;
      }

      // Get users
      const usersResult = await this.userRepository.findAll(filters);
      if (usersResult.isFailure()) {
        return Result.failure(`Failed to fetch users: ${usersResult.error}`);
      }

      // Get total count for pagination
      const countFilters = { ...filters };
      delete countFilters.limit;
      delete countFilters.offset;

      const countResult = await this.userRepository.count(countFilters);
      if (countResult.isFailure()) {
        return Result.failure(`Failed to count users: ${countResult.error}`);
      }

      const users = usersResult.value;
      const total = countResult.value;
      const hasMore = (request.offset || 0) + users.length < total;

      return Result.success({
        users,
        total,
        hasMore
      });

    } catch (error) {
      return Result.failure(`Unexpected error getting users: ${error}`);
    }
  }
}