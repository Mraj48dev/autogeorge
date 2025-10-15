import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * GET /api/admin/auth/users/[id]
 * Gets a specific user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const result = await authAdminFacade.getUser({
      userId: params.id,
    });

    if (result.isFailure()) {
      if (result.error.code === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to get user', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth/users/[id]
 * Deactivates a user (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const result = await authAdminFacade.deactivateUser(params.id);

    if (result.isFailure()) {
      if (result.error.message === 'User not found') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to deactivate user', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Deactivate user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/auth/users/[id]
 * Activates a user or updates profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Handle activation
    if (body.action === 'activate') {
      const result = await authAdminFacade.activateUser(params.id);

      if (result.isFailure()) {
        return NextResponse.json(
          { error: 'Failed to activate user', details: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.value,
      });
    }

    // Handle other updates (placeholder for future functionality)
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}