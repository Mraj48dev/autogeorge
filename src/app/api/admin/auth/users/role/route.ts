import { NextRequest, NextResponse } from 'next/server';
import { createAuthContainer } from '@/shared/container/AuthContainer';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'userId and newRole are required' },
        { status: 400 }
      );
    }

    const container = createAuthContainer();
    const result = await container.authAdminFacade.updateUserRole({
      userId,
      newRole
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}