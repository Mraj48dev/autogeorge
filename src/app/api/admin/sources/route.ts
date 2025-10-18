import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/sources
 * Lists all sources - SIMPLIFIED VERSION
 */
export async function GET(request: NextRequest) {
  try {
    // Get all sources from database
    const sources = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        isActive: true,
        lastFetchAt: true,
        createdAt: true,
        updatedAt: true,
        // Count total articles/feed items for this source
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    // Transform for frontend
    const transformedSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type || 'RSS',
      url: source.url,
      isActive: source.isActive,
      lastFetch: source.lastFetchAt?.toISOString(),
      totalItems: source._count.articles,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      sources: transformedSources,
      total: sources.length
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
 * Create a new source - SIMPLIFIED VERSION
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type = 'RSS', isActive = true } = body;

    // Basic validation
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Create source
    const source = await prisma.source.create({
      data: {
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