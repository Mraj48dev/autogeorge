import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * GET /api/admin/sources
 * Lists all sources with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') as any || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;

    const container = createSourcesContainer();
    const result = await container.sourcesAdminFacade.getSources({
      page,
      limit,
      sortBy,
      sortOrder,
      type,
      status,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.value);

  } catch (error) {
    console.error('Error getting sources:', error);
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
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const container = createSourcesContainer();
    const result = await container.sourcesAdminFacade.createSource({
      name: body.name,
      type: body.type,
      url: body.url,
      configuration: body.configuration,
      testConnection: body.testConnection ?? true,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.value, { status: 201 });

  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}