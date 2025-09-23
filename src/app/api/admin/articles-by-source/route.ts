import { NextRequest, NextResponse } from 'next/server';
import { getContentContainer } from '@/modules/content/infrastructure/container/ContentContainer';

/**
 * GET /api/admin/articles-by-source
 * Retrieves articles grouped by source with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const status = searchParams.get('status') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const container = getContentContainer();
    const useCase = container.getArticlesBySource;

    const result = await useCase.execute({
      filters: {
        status,
        sourceId,
        dateFrom,
        dateTo
      },
      pagination: {
        limit,
        offset
      }
    });

    if (!result.isSuccess()) {
      return NextResponse.json(
        { error: result.getError() },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.getValue()
    });

  } catch (error) {
    console.error('Articles by source API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}