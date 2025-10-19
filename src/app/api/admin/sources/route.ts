import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { requireAuth, multiTenantQueries } from '@/lib/auth';

/**
 * GET /api/admin/sources
 * Lists user's sources - MULTI-TENANT VERSION
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication and get user context
    const user = await requireAuth(request);

    // Get user's sources only
    const sources = await multiTenantQueries.getUserSources(user.userId);

    // Transform for frontend
    const transformedSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type || 'RSS',
      url: source.url,
      isActive: source.isActive,
      lastFetch: source.lastFetchAt?.toISOString(),
      totalItems: 0, // TODO: Add count when needed
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
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