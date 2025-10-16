import { UseCase } from '@/shared/application/base/UseCase';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuthenticationService } from '../../domain/ports/AuthenticationService';
import { UserRoleType } from '../../domain/value-objects/UserRole';

export interface CreateUserRequest {
  email: string;
  role?: UserRoleType;
  organizationId?: string;
  permissions?: string[];
  createExternalUser?: boolean;
  password?: string;
}

export interface CreateUserResponse {
  user: User;
  externalUserId?: string;
}

export class CreateUser extends UseCase<CreateUserRequest, CreateUserResponse> {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthenticationService
  ) {
    super();
  }

  async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse>> {
    try {
      // Check if email already exists
      const emailExistsResult = await this.userRepository.emailExists(request.email);
      if (emailExistsResult.isFailure()) {
        return Result.failure(`Failed to check email existence: ${emailExistsResult.error}`);
      }

      if (emailExistsResult.value) {
        return Result.failure('Email already exists');
      }

      let externalUserId: string | undefined;

      // Create external user if requested
      if (request.createExternalUser) {
        const externalUserResult = await this.authService.createExternalUser(
          request.email,
          request.password
        );

        if (externalUserResult.isFailure()) {
          return Result.failure(`Failed to create external user: ${externalUserResult.error}`);
        }

        externalUserId = externalUserResult.value.externalUserId;
      }

      // Create user entity
      const userResult = User.create({
        email: request.email,
        clerkUserId: externalUserId,
        role: request.role,
        organizationId: request.organizationId,
        permissions: request.permissions
      });

      if (userResult.isFailure()) {
        // Cleanup external user if it was created
        if (externalUserId) {
          await this.authService.deleteExternalUser(externalUserId);
        }
        return Result.failure(`Failed to create user: ${userResult.error}`);
      }

      // Save to repository
      const saveResult = await this.userRepository.save(userResult.value);
      if (saveResult.isFailure()) {
        // Cleanup external user if it was created
        if (externalUserId) {
          await this.authService.deleteExternalUser(externalUserId);
        }
        return Result.failure(`Failed to save user: ${saveResult.error}`);
      }

      return Result.success({
        user: saveResult.value,
        externalUserId
      });

    } catch (error) {
      return Result.failure(`Unexpected error creating user: ${error}`);
    }
  }
}