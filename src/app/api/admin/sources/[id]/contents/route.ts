import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/sources/[id]/contents
 * Retrieves all feed items (contents) from a specific source
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sourceId = resolvedParams.id;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Check if source exists
    const source = await prisma.source.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    // Fetch feed items (contents) for this source
    const [feedItems, totalCount] = await Promise.all([
      prisma.feedItem.findMany({
        where: { sourceId },
        orderBy: { publishedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.feedItem.count({
        where: { sourceId }
      })
    ]);

    return NextResponse.json({
      success: true,
      contenuti: feedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1,
      },
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        status: source.status,
      }
    });

  } catch (error) {
    console.error('Error fetching contents for source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}