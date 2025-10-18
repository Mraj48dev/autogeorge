import { NextRequest, NextResponse } from 'next/server';
import { createAuthContainer } from '@/shared/container/AuthContainer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const role = searchParams.get('role') || undefined;
    const email = searchParams.get('email') || undefined;

    const container = createAuthContainer();
    const result = await container.authAdminFacade.getUsers({
      page,
      limit,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      role: role as any,
      email
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