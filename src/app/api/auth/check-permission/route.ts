import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserManagementContainer } from '@/composition-root/container';

/**
 * API endpoint for checking user permissions from frontend components.
 *
 * This endpoint maintains module separation by using the DI container
 * to access user-management functionality.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { permission, resourceId, organizationId } = body;

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission parameter is required' },
        { status: 400 }
      );
    }

    // Get user management facade through DI container (maintains module separation)
    const { userManagementFacade } = createUserManagementContainer();

    // Check permission
    const permissionResult = await userManagementFacade.checkPermission(
      userId,
      permission,
      resourceId,
      organizationId
    );

    if (permissionResult.isFailure()) {
      return NextResponse.json(
        {
          error: 'Permission check failed',
          details: permissionResult.error,
          hasPermission: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasPermission: permissionResult.value,
      permission,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Permission check API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        hasPermission: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}