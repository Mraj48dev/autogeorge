import { NextResponse } from 'next/server';
import { createAuthContainer } from '../../../../../modules/auth/infrastructure/createAuthContainer';

/**
 * GET /api/admin/auth/current-user
 * Gets the current authenticated user
 */
export async function GET() {
  try {
    const authContainer = createAuthContainer();
    const result = await authContainer.authAdminFacade.getCurrentUser();

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 401 }
      );
    }

    const { user } = result.value;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.getValue(),
        email: user.email.getValue(),
        name: user.name.getValue(),
        role: user.role.getValue(),
        status: user.status.getValue(),
        profileImageUrl: user.profileImageUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}