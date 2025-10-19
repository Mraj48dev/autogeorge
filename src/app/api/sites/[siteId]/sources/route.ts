/**
 * Site-Scoped Sources API - NEW MULTI-TENANT PATTERN
 *
 * This demonstrates the new API pattern where resources are scoped to sites.
 * URL: /api/sites/[siteId]/sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserSite, multiTenantQueries } from '@/lib/auth';
import { prisma } from '@/shared/database/prisma';

interface RouteParams {
  params: { siteId: string };
}

/**
 * GET /api/sites/[siteId]/sources
 * Get sources for a specific site (user must own the site)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Verify site ownership
    const site = await getUserSite(user.userId, params.siteId);
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 404 }
      );
    }

    // Get user's sources (currently not site-specific, but filtered by user)
    const sources = await multiTenantQueries.getUserSources(user.userId);

    // Transform for frontend
    const transformedSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      isActive: source.isActive,
      lastFetch: source.lastFetchAt?.toISOString(),
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        url: site.url
      },
      sources: transformedSources,
      total: transformedSources.length
    });

  } catch (error) {
    console.error('GET /api/sites/[siteId]/sources error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites/[siteId]/sources
 * Create a new source for a specific site
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Verify site ownership
    const site = await getUserSite(user.userId, params.siteId);
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, url, type = 'RSS', isActive = true } = body;

    // Validation
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Create source associated with user
    // Note: In future, we might add siteId association to sources
    const source = await prisma.source.create({
      data: {
        userId: user.userId,
        name,
        url,
        type,
        isActive,
        // TODO: Add siteId field when implementing site-specific sources
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
    console.error('POST /api/sites/[siteId]/sources error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}