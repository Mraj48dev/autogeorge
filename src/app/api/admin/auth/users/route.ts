import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * GET /api/admin/auth/users
 * Lists users with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;

    const result = await authAdminFacade.listUsers({
      page,
      limit,
      role,
      isActive,
      search,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: 'Failed to list users', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('List users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/auth/users
 * Creates a new user or authenticates existing user
 */
export async function POST(request: NextRequest) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await authAdminFacade.createUser({
      email: body.email,
      name: body.name,
      image: body.image,
      role: body.role,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: 'Failed to create user', details: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
    });
  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}