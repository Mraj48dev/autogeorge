import { NextRequest, NextResponse } from 'next/server';
import { SourcesContainer, createSourcesContainer } from '../../../../modules/sources/infrastructure/container/SourcesContainer';
import { Config } from '../../../../modules/sources/shared/config/env';

/**
 * GET /api/admin/sources
 * Lists all sources with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize the sources container
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;

    // Execute use case
    const result = await sourcesAdminFacade.getSources({
      page,
      limit,
      type: type as any,
      status: status as any,
    });

    if (result.isFailure()) {
      console.error('Error getting sources:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.value);

  } catch (error) {
    console.error('Error in sources endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sources
 * Creates a new source
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize the sources container
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Execute use case
    const result = await sourcesAdminFacade.createSource({
      name: body.name,
      type: body.type,
      url: body.url,
      configuration: body.configuration || {},
      metadata: body.metadata || {},
    });

    if (result.isFailure()) {
      console.error('Error creating source:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    console.log('✅ Source created successfully:', result.value.source);

    return NextResponse.json({
      success: true,
      message: `Source "${body.name}" created successfully`,
      source: result.value.source
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create source endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}