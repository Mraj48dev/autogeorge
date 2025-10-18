import { Result } from '../../../sources/shared/domain/types/Result';
import { BaseUseCase } from '../../../sources/shared/application/base/UseCase';
import { UserRepository, FindUsersOptions, UserSummaryPage } from '../../domain/ports/UserRepository';
import { UserRole } from '../../domain/user.entity';

/**
 * Use case for retrieving users with pagination and filtering
 */
export class GetUsers extends BaseUseCase<GetUsersRequest, GetUsersResponse> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(request: GetUsersRequest): Promise<Result<GetUsersResponse, Error>> {
    try {
      // Validate request
      const validationResult = this.validateGetUsersRequest(request);
      if (validationResult.isFailure()) {
        return Result.failure(validationResult.error);
      }

      // Build options
      const options: FindUsersOptions = {
        page: request.page || 1,
        limit: Math.min(request.limit || 20, 100), // Max 100 items per page
        sortBy: request.sortBy || 'createdAt',
        sortOrder: request.sortOrder || 'desc',
      };

      if (request.role) {
        options.role = request.role;
      }

      if (request.email) {
        options.email = request.email;
      }

      // Get users
      const usersResult = await this.userRepository.findSummaries(options);
      if (usersResult.isFailure()) {
        return Result.failure(usersResult.error);
      }

      const userPage = usersResult.value;

      return Result.success({
        users: userPage.users,
        pagination: {
          page: userPage.page,
          limit: userPage.limit,
          total: userPage.total,
          totalPages: userPage.totalPages,
          hasNext: userPage.page < userPage.totalPages,
          hasPrev: userPage.page > 1,
        }
      });

    } catch (error) {
      return Result.failure(this.handleError(error, 'Failed to get users'));
    }
  }

  private validateGetUsersRequest(request: GetUsersRequest): Result<void, Error> {
    if (request.page && request.page < 1) {
      return Result.failure(new Error('Page must be greater than 0'));
    }

    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      return Result.failure(new Error('Limit must be between 1 and 100'));
    }

    const validSortFields = ['email', 'name', 'role', 'createdAt', 'lastSignInAt'];
    if (request.sortBy && !validSortFields.includes(request.sortBy)) {
      return Result.failure(new Error(`Invalid sortBy field. Valid fields: ${validSortFields.join(', ')}`));
    }

    const validSortOrders = ['asc', 'desc'];
    if (request.sortOrder && !validSortOrders.includes(request.sortOrder)) {
      return Result.failure(new Error(`Invalid sortOrder. Valid orders: ${validSortOrders.join(', ')}`));
    }

    return Result.success(undefined);
  }
}

// Request interface
export interface GetUsersRequest {
  page?: number;
  limit?: number;
  sortBy?: 'email' | 'name' | 'role' | 'createdAt' | 'lastSignInAt';
  sortOrder?: 'asc' | 'desc';
  role?: UserRole;
  email?: string;
}

// Response interface
export interface GetUsersResponse {
  users: any[]; // UserSummary[]
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}