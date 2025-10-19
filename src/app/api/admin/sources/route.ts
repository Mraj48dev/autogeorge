import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/sources
 * Lists user's sources - MULTI-TENANT VERSION
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔐 GET /api/admin/sources - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    // Get user's sources directly from database with multi-tenant filtering
    const sources = await prisma.source.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' }
    });

    // Transform for frontend - match the interface expected by the frontend
    const transformedSources = sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      status: source.status || 'active',
      defaultCategory: source.defaultCategory,
      isActive: source.isActive,
      lastFetch: source.lastFetchAt ? source.lastFetchAt.toISOString() : null,
      totalItems: 0, // Will be populated from feedItems if needed
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      configuration: source.configuration || {},
      metadata: source.metadata || {}
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
    console.log('🔐 POST /api/admin/sources - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const body = await request.json();
    console.log('📝 Request body:', body);

    const {
      name,
      url,
      type = 'RSS',
      defaultCategory,
      configuration = {},
      testConnection = false
    } = body;

    // Basic validation
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // URL is required for RSS feeds
    if (type === 'RSS' && !url) {
      return NextResponse.json(
        { error: 'URL is required for RSS feeds' },
        { status: 400 }
      );
    }

    // Create source with user association
    const source = await prisma.source.create({
      data: {
        userId: user.userId, // Associate with current user
        name,
        url: url || null,
        type,
        status: 'active',
        defaultCategory: defaultCategory || null,
        configuration: configuration,
        metadata: {},
        isActive: true,
        lastFetchAt: null,
        lastErrorAt: null,
        lastError: null,
        lastFetchStatus: null
      }
    });

    console.log('✅ Source created successfully:', { sourceId: source.id, name: source.name });

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        status: source.status,
        defaultCategory: source.defaultCategory,
        isActive: source.isActive,
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
        configuration: source.configuration,
        metadata: source.metadata
      }
    });

  } catch (error) {
    console.error('POST /api/admin/sources error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sources
 * Delete a source - MULTI-TENANT VERSION
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔐 DELETE /api/admin/sources - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const body = await request.json();
    const { sourceId } = body;
    console.log('📝 Delete request for sourceId:', sourceId);

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }

    // First verify the source belongs to this user
    const existingSource = await prisma.source.findFirst({
      where: {
        id: sourceId,
        userId: user.userId
      }
    });

    if (!existingSource) {
      console.log('❌ Source not found or access denied:', { sourceId, userId: user.userId });
      return NextResponse.json(
        { error: 'Source not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the source
    await prisma.source.delete({
      where: {
        id: sourceId
      }
    });

    console.log('✅ Source deleted successfully:', { sourceId, name: existingSource.name });

    return NextResponse.json({
      success: true,
      message: 'Source deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/admin/sources error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}