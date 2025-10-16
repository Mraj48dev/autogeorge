import { NextRequest, NextResponse } from 'next/server';
import { createUserManagementContainer } from '@/composition-root/container';
import { auth } from '@clerk/nextjs/server';

/**
 * Authorization middleware that checks user permissions for API endpoints.
 *
 * This middleware is designed to be framework-agnostic and module-independent.
 * It only interacts with the user-management module through the DI container,
 * maintaining strict module separation.
 */

export interface AuthorizationOptions {
  permission: string;
  resourceId?: string;
  organizationId?: string;
  allowSystem?: boolean; // Allow system users (for health checks, etc.)
}

export async function withAuthorization(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: AuthorizationOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get user from Clerk authentication
      const { userId } = auth();

      // Allow system operations if specified
      if (options.allowSystem && !userId) {
        return handler(req);
      }

      // Require authentication for protected endpoints
      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get user management facade through DI container (maintaining module separation)
      const { userManagementFacade } = createUserManagementContainer();

      // Check if user has required permission
      const permissionResult = await userManagementFacade.checkPermission(
        userId,
        options.permission,
        options.resourceId,
        options.organizationId
      );

      if (permissionResult.isFailure()) {
        return NextResponse.json(
          { error: 'Authorization check failed', details: permissionResult.error },
          { status: 500 }
        );
      }

      if (!permissionResult.value) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            required: options.permission,
            userId
          },
          { status: 403 }
        );
      }

      // User is authorized, proceed with the request
      return handler(req);

    } catch (error) {
      console.error('Authorization middleware error:', error);
      return NextResponse.json(
        { error: 'Internal authorization error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to create authorization decorator for API routes
 */
export function requirePermission(permission: string, options?: Partial<AuthorizationOptions>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = withAuthorization(originalMethod, {
      permission,
      ...options
    });

    return descriptor;
  };
}

/**
 * Middleware factory for common permission patterns
 */
export const AuthMiddleware = {
  /**
   * Admin-only endpoints (SUPER_ADMIN or ORGANIZATION_ADMIN)
   */
  adminOnly: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'admin:access' }),

  /**
   * Content management permissions
   */
  contentCreate: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'content:create' }),

  contentEdit: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'content:edit' }),

  contentView: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'content:view' }),

  /**
   * Source management permissions
   */
  sourcesView: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'sources:view' }),

  sourcesManage: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'sources:manage' }),

  /**
   * User management permissions
   */
  usersManage: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, { permission: 'users:manage' }),

  /**
   * System operations (allows system users)
   */
  systemOperation: (handler: (req: NextRequest) => Promise<NextResponse>) =>
    withAuthorization(handler, {
      permission: 'system:access',
      allowSystem: true
    }),
};

/**
 * Permission constants for consistency across the application
 */
export const Permissions = {
  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  SYSTEM_ACCESS: 'system:access',

  // Content permissions
  CONTENT_CREATE: 'content:create',
  CONTENT_EDIT: 'content:edit',
  CONTENT_VIEW: 'content:view',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',

  // Source permissions
  SOURCES_MANAGE: 'sources:manage',
  SOURCES_VIEW: 'sources:view',

  // User permissions
  USERS_MANAGE: 'users:manage',
  USERS_VIEW: 'users:view',

  // Organization permissions
  ORGANIZATION_MANAGE: 'organization:manage',
  ORGANIZATION_VIEW: 'organization:view',

  // API permissions
  API_ACCESS: 'api:access',
} as const;

export type PermissionString = typeof Permissions[keyof typeof Permissions];