import { NextRequest, NextResponse } from 'next/server';
import { getSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * PUT /api/admin/sources/[id]
 * Updates an existing source
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const container = getSourcesContainer();
    const result = await container.sourcesAdminFacade.updateSource({
      sourceId,
      name: body.name,
      url: body.url,
      configuration: body.configuration || {},
      metadata: body.metadata || {},
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Source "${body.name}" updated successfully`,
      source: result.value.source
    });

  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/sources/[id]
 * Partially updates a source (e.g., status changes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const container = getSourcesContainer();

    if (body.status) {
      const result = await container.sourcesAdminFacade.updateSourceStatus({
        sourceId,
        status: body.status,
      });

      if (result.isFailure()) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Source status updated to ${body.status}`,
        source: result.value.source
      });
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error patching source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sources/[id]
 * Deletes a source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceId = params.id;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const container = getSourcesContainer();
    const result = await container.sourcesAdminFacade.deleteSource({
      sourceId,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Source deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}