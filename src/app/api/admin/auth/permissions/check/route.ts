import { NextRequest, NextResponse } from 'next/server';
import { createAuthContainer } from '@/shared/container/AuthContainer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requiredRole, resource, action } = body;

    if (!requiredRole) {
      return NextResponse.json(
        { error: 'requiredRole is required' },
        { status: 400 }
      );
    }

    const container = createAuthContainer();
    const result = await container.authAdminFacade.checkPermissions({
      requiredRole,
      resource,
      action
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