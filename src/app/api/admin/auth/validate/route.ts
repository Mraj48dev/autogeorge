import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * POST /api/admin/auth/validate
 * Validates if a user has required permissions
 */
export async function POST(request: NextRequest) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.requiredPermissions || !Array.isArray(body.requiredPermissions)) {
      return NextResponse.json(
        { error: 'Required permissions array is required' },
        { status: 400 }
      );
    }

    const result = await authAdminFacade.validateAccess({
      userId: body.userId,
      requiredPermissions: body.requiredPermissions,
      requireAll: body.requireAll !== false, // Default to true
    });

    if (result.isFailure()) {
      if (result.error.code === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (result.error.code === 'USER_INACTIVE') {
        return NextResponse.json(
          { error: 'User is inactive' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to validate permissions', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Validate permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}