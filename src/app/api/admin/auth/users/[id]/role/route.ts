import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * PATCH /api/admin/auth/users/[id]/role
 * Updates a user's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    const result = await authAdminFacade.updateUserRole({
      userId: params.id,
      role: body.role,
    });

    if (result.isFailure()) {
      if (result.error.code === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (result.error.code === 'INVALID_ROLE') {
        return NextResponse.json(
          { error: 'Invalid role', details: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update user role', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Update user role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}