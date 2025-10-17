import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/shared/middleware/authorization';
import { createUserManagementContainer } from '@/composition-root/container';
import { auth } from '@clerk/nextjs/server';
import { UserRoleType } from '@/modules/user-management/domain/value-objects/UserRole';

/**
 * GET /api/admin/users
 * Lista tutti gli utenti con filtri e paginazione
 * Protected: Requires 'users:view' permission
 */
const getUsersHandler = async (request: NextRequest) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role') as UserRoleType || undefined;
    const isActive = searchParams.get('isActive') === 'true' ? true :
                     searchParams.get('isActive') === 'false' ? false : undefined;

    const { userManagementFacade } = createUserManagementContainer();

    const result = await userManagementFacade.getUsers({
      requestedBy: userId,
      page,
      limit,
      role,
      isActive
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result.value
    });

  } catch (error) {
    console.error('Get users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/admin/users
 * Crea un nuovo utente
 * Protected: Requires 'users:manage' permission
 */
const createUserHandler = async (request: NextRequest) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role, clerkUserId, createExternalUser = true } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
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

    const result = await userManagementFacade.createUser({
      email,
      role,
      clerkUserId,
      createExternalUser
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} created successfully`,
      user: {
        id: result.value.user.id.value,
        email: result.value.user.email,
        role: result.value.user.role.value,
        isActive: result.value.user.isActive,
        createdAt: result.value.user.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// Apply authorization middleware
export const GET = AuthMiddleware.usersManage(getUsersHandler);
export const POST = AuthMiddleware.usersManage(createUserHandler);