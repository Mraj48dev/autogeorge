import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/shared/database/prisma';

/**
 * PUT /api/admin/sources/[id]
 * Update a source - MULTI-TENANT VERSION
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 PUT /api/admin/sources/[id] - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const sourceId = params.id;
    console.log('📝 Updating sourceId:', sourceId);

    const body = await request.json();
    console.log('📝 Update data:', body);

    const {
      name,
      url,
      type,
      defaultCategory,
      configuration
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

    // Update the source
    const updatedSource = await prisma.source.update({
      where: {
        id: sourceId
      },
      data: {
        name,
        url: url || null,
        type: type || existingSource.type,
        defaultCategory: defaultCategory || null,
        configuration: configuration || existingSource.configuration,
        updatedAt: new Date()
      }
    });

    console.log('✅ Source updated successfully:', { sourceId, name: updatedSource.name });

    return NextResponse.json({
      success: true,
      source: {
        id: updatedSource.id,
        name: updatedSource.name,
        type: updatedSource.type,
        url: updatedSource.url,
        status: updatedSource.status,
        defaultCategory: updatedSource.defaultCategory,
        isActive: updatedSource.isActive,
        createdAt: updatedSource.createdAt.toISOString(),
        updatedAt: updatedSource.updatedAt.toISOString(),
        configuration: updatedSource.configuration,
        metadata: updatedSource.metadata
      }
    });

  } catch (error) {
    console.error('PUT /api/admin/sources/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/sources/[id]
 * Partially updates a source (e.g., status changes) - MULTI-TENANT VERSION
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 PATCH /api/admin/sources/[id] - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const sourceId = params.id;
    console.log('📝 Patching sourceId:', sourceId);

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('📝 Patch data:', body);

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

    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    // Update the source
    const updatedSource = await prisma.source.update({
      where: {
        id: sourceId
      },
      data: updateData
    });

    console.log('✅ Source patched successfully:', { sourceId, updateData });

    return NextResponse.json({
      success: true,
      message: `Source updated successfully`,
      source: {
        id: updatedSource.id,
        name: updatedSource.name,
        type: updatedSource.type,
        url: updatedSource.url,
        status: updatedSource.status,
        defaultCategory: updatedSource.defaultCategory,
        isActive: updatedSource.isActive,
        createdAt: updatedSource.createdAt.toISOString(),
        updatedAt: updatedSource.updatedAt.toISOString(),
        configuration: updatedSource.configuration,
        metadata: updatedSource.metadata
      }
    });

  } catch (error) {
    console.error('PATCH /api/admin/sources/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sources/[id]
 * Delete a specific source by ID - MULTI-TENANT VERSION
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔐 DELETE /api/admin/sources/[id] - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const sourceId = params.id;
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

    console.log(`🗑️ Deleting source: ${existingSource.name} (${sourceId})`);

    // First delete related feedItems
    const deletedFeedItems = await prisma.feedItem.deleteMany({
      where: { sourceId: sourceId }
    });

    console.log(`🗑️ Deleted ${deletedFeedItems.count} feed items`);

    // Then delete related articles
    const deletedArticles = await prisma.article.deleteMany({
      where: { sourceId: sourceId }
    });

    console.log(`🗑️ Deleted ${deletedArticles.count} articles`);

    // Finally delete the source
    await prisma.source.delete({
      where: {
        id: sourceId
      }
    });

    console.log('✅ Source deleted successfully:', { sourceId, name: existingSource.name });

    return NextResponse.json({
      success: true,
      message: `Source "${existingSource.name}" deleted successfully`,
      deletedItems: {
        feedItems: deletedFeedItems.count,
        articles: deletedArticles.count
      }
    });

  } catch (error) {
    console.error('DELETE /api/admin/sources/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}