import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserManagementContainer } from '@/composition-root/container';

/**
 * API endpoint for getting current user's role information.
 *
 * This endpoint maintains module separation by using the DI container
 * to access user-management functionality.
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user management facade through DI container (maintains module separation)
    const { userManagementFacade } = createUserManagementContainer();

    // Get user information by trying to fetch with system permissions
    // This is a workaround since we need to implement a proper getCurrentUser method
    const userResult = await userManagementFacade.getUserById(userId, 'system');

    if (userResult.isFailure()) {
      return NextResponse.json(
        {
          error: 'Failed to get user information',
          details: userResult.error
        },
        { status: 500 }
      );
    }

    if (!userResult.value) {
      return NextResponse.json(
        {
          error: 'User not found in system',
          role: null
        },
        { status: 404 }
      );
    }

    const user = userResult.value;

    return NextResponse.json({
      role: user.role.value,
      userId: user.id.value,
      email: user.email,
      isActive: user.isActive,
      permissions: user.getAllPermissions(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('User role API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}