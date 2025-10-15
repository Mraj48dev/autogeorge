import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * POST /api/admin/auth/users/[id]/permissions
 * Grants permissions to a user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.permissions || !Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      );
    }

    const result = await authAdminFacade.grantPermissions({
      userId: params.id,
      permissions: body.permissions,
    });

    if (result.isFailure()) {
      if (result.error.code === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (result.error.code === 'INVALID_PERMISSIONS') {
        return NextResponse.json(
          { error: 'Invalid permissions', details: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to grant permissions', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Grant permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth/users/[id]/permissions
 * Revokes permissions from a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.permissions || !Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      );
    }

    const result = await authAdminFacade.revokePermissions({
      userId: params.id,
      permissions: body.permissions,
    });

    if (result.isFailure()) {
      if (result.error.code === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (result.error.code === 'INVALID_PERMISSIONS') {
        return NextResponse.json(
          { error: 'Invalid permissions', details: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to revoke permissions', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Revoke permissions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}