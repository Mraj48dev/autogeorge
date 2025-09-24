import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * PUT /api/admin/sources/[id]
 * Updates an existing source
 */
export async function PUT(
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

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const container = createSourcesContainer();
    const result = await container.sourcesAdminFacade.updateSource({
      sourceId,
      name: body.name,
      url: body.url,
      defaultCategory: body.defaultCategory,
      configuration: body.configuration || {},
      metadata: body.metadata || {},
    });

    if (result.isFailure()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Source "${body.name}" updated successfully`,
      source: result.value.source
    });

  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/sources/[id]
 * Partially updates a source (e.g., status changes)
 */
export async function PATCH(
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

    const body = await request.json();
    const container = createSourcesContainer();

    if (body.status) {
      const result = await container.sourcesAdminFacade.updateSourceStatus({
        sourceId,
        status: body.status,
      });

      if (result.isFailure()) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Source status updated to ${body.status}`,
        source: result.value.source
      });
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error patching source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sources/[id]
 * Deletes a source - Direct Prisma implementation for reliability
 */
export async function DELETE(
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

    // Use direct Prisma for reliability in production
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Verifica che la source esista
      const existingSource = await prisma.source.findUnique({
        where: { id: sourceId }
      });

      if (!existingSource) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        );
      }

      console.log(`🗑️ Deleting source: ${existingSource.name} (${sourceId})`);

      // Prima elimina tutti i feedItems correlati
      const deletedFeedItems = await prisma.feedItem.deleteMany({
        where: { sourceId: sourceId }
      });

      console.log(`🗑️ Deleted ${deletedFeedItems.count} feed items`);

      // Poi elimina tutti gli articles correlati
      const deletedArticles = await prisma.article.deleteMany({
        where: { sourceId: sourceId }
      });

      console.log(`🗑️ Deleted ${deletedArticles.count} articles`);

      // Infine elimina la source
      await prisma.source.delete({
        where: { id: sourceId }
      });

      console.log(`✅ Source "${existingSource.name}" deleted successfully`);

      return NextResponse.json({
        success: true,
        message: `Source "${existingSource.name}" deleted successfully`,
        deletedItems: {
          feedItems: deletedFeedItems.count,
          articles: deletedArticles.count
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}