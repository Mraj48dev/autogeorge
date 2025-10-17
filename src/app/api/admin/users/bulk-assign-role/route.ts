import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/shared/middleware/authorization';
import { createUserManagementContainer } from '@/composition-root/container';
import { auth } from '@clerk/nextjs/server';
import { UserRoleType } from '@/modules/user-management/domain/value-objects/UserRole';

/**
 * POST /api/admin/users/bulk-assign-role
 * Assegna un ruolo a multipli utenti
 * Protected: Requires 'users:manage' permission
 */
const bulkAssignRoleHandler = async (request: NextRequest) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userIds, role } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRoleType).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    if (userIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 users can be processed at once' },
        { status: 400 }
      );
    }

    const { userManagementFacade } = createUserManagementContainer();

    const result = await userManagementFacade.bulkAssignRole(
      userIds,
      role,
      userId
    );

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const { successful, failed } = result.value;

    return NextResponse.json({
      success: true,
      message: `Bulk role assignment completed`,
      summary: {
        total: userIds.length,
        successful: successful.length,
        failed: failed.length
      },
      results: {
        successful,
        failed
      },
      role
    });

  } catch (error) {
    console.error('Bulk assign role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// Apply authorization middleware
export const POST = AuthMiddleware.usersManage(bulkAssignRoleHandler);