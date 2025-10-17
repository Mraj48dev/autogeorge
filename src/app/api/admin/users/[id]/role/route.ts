import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/shared/middleware/authorization';
import { createUserManagementContainer } from '@/composition-root/container';
import { auth } from '@clerk/nextjs/server';
import { UserRoleType } from '@/modules/user-management/domain/value-objects/UserRole';

/**
 * PUT /api/admin/users/[id]/role
 * Assegna un nuovo ruolo a un utente
 * Protected: Requires 'users:manage' permission
 */
const assignRoleHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { role } = body;

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

    const { userManagementFacade } = createUserManagementContainer();

    const result = await userManagementFacade.assignRole({
      userId: targetUserId,
      newRole: role,
      assignedBy: userId
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Role ${role} assigned successfully`,
      user: {
        id: result.value.user.id.value,
        email: result.value.user.email,
        role: result.value.user.role.value,
        updatedAt: result.value.user.updatedAt
      }
    });

  } catch (error) {
    console.error('Assign role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * GET /api/admin/users/[id]/role
 * Ottiene il ruolo corrente di un utente
 * Protected: Requires 'users:view' permission
 */
const getUserRoleHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: targetUserId } = await params;
    const { userManagementFacade } = createUserManagementContainer();

    const result = await userManagementFacade.getUserById(targetUserId, userId);

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.value;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.value,
        email: user.email,
        role: user.role.value,
        isActive: user.isActive,
        permissions: user.getAllPermissions(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get user role API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// Apply authorization middleware
export const PUT = AuthMiddleware.usersManage(assignRoleHandler);
export const GET = AuthMiddleware.usersManage(getUserRoleHandler);