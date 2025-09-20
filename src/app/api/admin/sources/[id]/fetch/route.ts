import { NextRequest, NextResponse } from 'next/server';
import { getSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * POST /api/admin/sources/[id]/fetch
 * Triggers a fetch operation for a specific source
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    const container = getSourcesContainer();
    const result = await container.sourcesAdminFacade.fetchFromSource({
      sourceId,
      force,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.value);

  } catch (error) {
    console.error('Error fetching from source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}