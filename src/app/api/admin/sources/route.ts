import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * GET /api/admin/sources
 * Lists user's sources - MULTI-TENANT VERSION
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    // Get user's sources using clean architecture with multi-tenant filtering
    const sourcesContainer = createSourcesContainer();
    const getSourcesResult = await sourcesContainer.sourcesAdminFacade.getSources({
      userId: user.userId, // NEW: Multi-tenant filtering
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    if (getSourcesResult.isFailure()) {
      console.error('❌ Failed to get user sources:', getSourcesResult.error);
      return NextResponse.json(
        { error: 'Failed to retrieve sources', details: getSourcesResult.error.message },
        { status: 500 }
      );
    }

    const sources = getSourcesResult.value.sources;

    // Transform for frontend
    const transformedSources = sources.map((source: any) => ({
      id: source.id,
      name: source.name,
      type: source.type || 'RSS',
      url: source.url,
      isActive: true, // Sources from clean architecture are active by default
      lastFetch: source.lastFetchAt ? new Date(source.lastFetchAt).toISOString() : null,
      totalItems: source.totalItems || 0,
      createdAt: source.createdAt ? new Date(source.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: source.updatedAt ? new Date(source.updatedAt).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      sources: transformedSources,
      total: sources.length,
      userId: user.userId // For debugging during development
    });

  } catch (error) {
    console.error('GET /api/admin/sources error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sources
 * Create a new source - MULTI-TENANT VERSION
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication and get user context
    const user = await requireAuth(request);

    const body = await request.json();
    const { name, url, type = 'RSS', isActive = true } = body;

    // Basic validation
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Create source with user association
    const source = await prisma.source.create({
      data: {
        userId: user.userId, // Associate with current user
        name,
        url,
        type,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        isActive: source.isActive,
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('POST /api/admin/sources error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}