import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';
import { UserContext, UserContextService, UserRole } from '@/shared/auth/UserContext';

/**
 * GET /api/user/sources - Get user's sources
 * Multi-tenant endpoint - returns only sources owned by the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create user context
    const userContext = UserContextService.createContext({
      userId: userId,
      role: UserRole.CONTENT_VIEWER, // TODO: Get role from Clerk user metadata
      permissions: [] // TODO: Get permissions from Clerk user metadata
    });

    // Get query parameters for pagination/filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    // Create sources container and get facade
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Get user's sources with filtering
    const result = await sourcesAdminFacade.getSources({
      userId: userContext.userId, // Multi-tenant filtering
      page,
      limit,
      type: type || undefined,
      status: status || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    if (result.isFailure()) {
      console.error('❌ Failed to get user sources:', result.error);
      return NextResponse.json(
        { error: 'Failed to retrieve sources' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('❌ Error in user sources API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/sources - Create new source for user
 * Multi-tenant endpoint - creates source associated with authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create user context
    const userContext = UserContextService.createContext({
      userId: userId,
      role: UserRole.CONTENT_MANAGER, // POST requires higher role
      permissions: ['sources:create'] // TODO: Get from Clerk metadata
    });

    // Check permissions
    if (!UserContextService.hasPermission(userContext, 'sources:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Create sources container and get facade
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Create source with user association
    const result = await sourcesAdminFacade.createSource({
      ...body,
      userId: userContext.userId, // Multi-tenant association
      testConnection: body.testConnection || false
    });

    if (result.isFailure()) {
      console.error('❌ Failed to create source:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value,
      message: 'Source created successfully'
    });

  } catch (error) {
    console.error('❌ Error in create source API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}