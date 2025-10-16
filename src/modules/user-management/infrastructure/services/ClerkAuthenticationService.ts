import { AuthenticationService, AuthenticationResult } from '../../domain/ports/AuthenticationService';
import { Result } from '@/shared/domain/types/Result';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { UserId } from '../../domain/value-objects/UserId';

// Clerk types (in real implementation, these would come from @clerk/nextjs)
interface ClerkUser {
  id: string;
  emailAddresses: { emailAddress: string }[];
  publicMetadata?: { role?: string };
}

export class ClerkAuthenticationService implements AuthenticationService {
  constructor(
    private userRepository: UserRepository
  ) {}

  async authenticate(clerkUserId: string): Promise<Result<AuthenticationResult>> {
    try {
      // Find user by Clerk ID
      const userResult = await this.userRepository.findByClerkUserId(clerkUserId);
      if (userResult.isFailure()) {
        return Result.failure(`Failed to authenticate user: ${userResult.error}`);
      }

      if (!userResult.value) {
        return Result.failure('User not found in system');
      }

      const user = userResult.value;

      // Check if user is active
      if (!user.isActive) {
        return Result.failure('User account is inactive');
      }

      // Record login
      const loginResult = user.recordLogin();
      if (loginResult.isSuccess()) {
        await this.userRepository.save(loginResult.value);
      }

      return Result.success({
        user: loginResult.isSuccess() ? loginResult.value : user,
        token: undefined, // Clerk handles tokens
        expiresAt: undefined
      });
    } catch (error) {
      return Result.failure(`Authentication error: ${error}`);
    }
  }

  async createExternalUser(email: string, password?: string): Promise<Result<{
    externalUserId: string;
    email: string;
  }>> {
    try {
      // TODO: Implement actual Clerk user creation
      // This is a mock implementation
      const mockClerkUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // In real implementation:
      // const clerkUser = await clerkClient.users.createUser({
      //   emailAddress: [email],
      //   password: password,
      // });

      return Result.success({
        externalUserId: mockClerkUserId,
        email
      });
    } catch (error) {
      return Result.failure(`Failed to create external user: ${error}`);
    }
  }

  async updateExternalUser(clerkUserId: string, updates: {
    email?: string;
    role?: string;
  }): Promise<Result<void>> {
    try {
      // TODO: Implement actual Clerk user update
      // In real implementation:
      // await clerkClient.users.updateUser(clerkUserId, {
      //   publicMetadata: { role: updates.role },
      //   emailAddress: updates.email ? [updates.email] : undefined
      // });

      console.log(`Mock: Updating Clerk user ${clerkUserId} with:`, updates);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(`Failed to update external user: ${error}`);
    }
  }

  async deleteExternalUser(clerkUserId: string): Promise<Result<void>> {
    try {
      // TODO: Implement actual Clerk user deletion
      // In real implementation:
      // await clerkClient.users.deleteUser(clerkUserId);

      console.log(`Mock: Deleting Clerk user ${clerkUserId}`);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(`Failed to delete external user: ${error}`);
    }
  }

  async verifyExternalUser(clerkUserId: string): Promise<Result<boolean>> {
    try {
      // TODO: Implement actual Clerk user verification
      // In real implementation:
      // const user = await clerkClient.users.getUser(clerkUserId);
      // return Result.success(!!user);

      console.log(`Mock: Verifying Clerk user ${clerkUserId}`);
      return Result.success(true);
    } catch (error) {
      return Result.failure(`Failed to verify external user: ${error}`);
    }
  }

  async getCurrentUser(): Promise<Result<User | null>> {
    try {
      // TODO: Implement current user detection from Clerk
      // In real implementation, this would get current user from Clerk context

      // For now, return null as this is typically handled by middleware
      return Result.success(null);
    } catch (error) {
      return Result.failure(`Failed to get current user: ${error}`);
    }
  }
}