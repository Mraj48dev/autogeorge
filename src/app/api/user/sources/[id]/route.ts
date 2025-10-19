import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';
import { UserContext, UserContextService, UserRole } from '@/shared/auth/UserContext';
import { SourceId } from '@/modules/sources/domain/value-objects/SourceId';

/**
 * GET /api/user/sources/[id] - Get specific source (only if owned by user)
 * Multi-tenant endpoint - checks ownership before returning
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      role: UserRole.CONTENT_VIEWER,
      permissions: []
    });

    // Create sources container and get repository
    const container = createSourcesContainer();
    const sourceRepository = container.sourceRepository;

    // Get source by ID
    const sourceId = SourceId.fromString(params.id);
    const sourceResult = await sourceRepository.findById(sourceId);

    if (sourceResult.isFailure()) {
      return NextResponse.json(
        { error: 'Failed to retrieve source' },
        { status: 500 }
      );
    }

    const source = sourceResult.value;
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    // Check ownership (multi-tenant security)
    if (!UserContextService.canAccessResource(userContext, source.userId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: source
    });

  } catch (error) {
    console.error('❌ Error in get source API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/sources/[id] - Update source (only if owned by user)
 * Multi-tenant endpoint - checks ownership before updating
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      role: UserRole.CONTENT_VIEWER,
      permissions: []
    });

    // Check permissions
    if (!UserContextService.hasPermission(userContext, 'sources:update')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Create sources container and get repository + facade
    const container = createSourcesContainer();
    const sourceRepository = container.sourceRepository;
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Get source by ID first to check ownership
    const sourceId = SourceId.fromString(params.id);
    const sourceResult = await sourceRepository.findById(sourceId);

    if (sourceResult.isFailure()) {
      return NextResponse.json(
        { error: 'Failed to retrieve source' },
        { status: 500 }
      );
    }

    const source = sourceResult.value;
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    // Check ownership (multi-tenant security)
    if (!UserContextService.canAccessResource(userContext, source.userId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update source
    const updateResult = await sourcesAdminFacade.updateSource({
      id: params.id,
      ...body,
      userId: userContext.userId // Ensure userId cannot be changed
    });

    if (updateResult.isFailure()) {
      console.error('❌ Failed to update source:', updateResult.error);
      return NextResponse.json(
        { error: updateResult.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updateResult.value,
      message: 'Source updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in update source API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/sources/[id] - Delete source (only if owned by user)
 * Multi-tenant endpoint - checks ownership before deleting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      role: UserRole.CONTENT_VIEWER,
      permissions: []
    });

    // Check permissions
    if (!UserContextService.hasPermission(userContext, 'sources:delete')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Create sources container and get repository
    const container = createSourcesContainer();
    const sourceRepository = container.sourceRepository;

    // Get source by ID first to check ownership
    const sourceId = SourceId.fromString(params.id);
    const sourceResult = await sourceRepository.findById(sourceId);

    if (sourceResult.isFailure()) {
      return NextResponse.json(
        { error: 'Failed to retrieve source' },
        { status: 500 }
      );
    }

    const source = sourceResult.value;
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    // Check ownership (multi-tenant security)
    if (!UserContextService.canAccessResource(userContext, source.userId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete source
    const deleteResult = await sourceRepository.delete(sourceId);

    if (deleteResult.isFailure()) {
      console.error('❌ Failed to delete source:', deleteResult.error);
      return NextResponse.json(
        { error: deleteResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Source deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in delete source API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}