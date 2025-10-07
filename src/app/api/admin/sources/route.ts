import { NextRequest, NextResponse } from 'next/server';
import { SourcesContainer, createSourcesContainer } from '../../../../modules/sources/infrastructure/container/SourcesContainer';
import { Config } from '../../../../modules/sources/shared/config/env';

/**
 * GET /api/admin/sources
 * Lists all sources with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // TEMPORARY FUNCTIONS: Check for utility parameters
    const { searchParams } = new URL(request.url);

    // Status correction functionality
    if (searchParams.get('fix') === 'status') {
      const { prisma } = await import('@/shared/database/prisma');

      try {
        // Fix items that have articleId - they should be 'processed'
        const articlesFixed = await prisma.feedItem.updateMany({
          where: {
            articleId: { not: null },
            status: { not: 'processed' }
          },
          data: {
            status: 'processed'
          }
        });

        // Set correct status for items without articles based on WordPress settings
        const wordPressSite = await prisma.wordPressSite.findFirst({
          select: { enableAutoGeneration: true }
        });

        const shouldBeDraft = wordPressSite?.enableAutoGeneration || false;
        const targetStatus = shouldBeDraft ? 'draft' : 'pending';

        const itemsWithoutArticles = await prisma.feedItem.updateMany({
          where: {
            articleId: null,
            status: { not: targetStatus }
          },
          data: {
            status: targetStatus
          }
        });

        // Get final stats
        const finalStats = await prisma.feedItem.groupBy({
          by: ['status'],
          _count: true
        });

        return NextResponse.json({
          success: true,
          message: 'Status correction completed',
          fixes: {
            itemsWithArticlesFixed: articlesFixed.count,
            itemsWithoutArticlesFixed: itemsWithoutArticles.count,
            targetStatusForNewItems: targetStatus,
            finalDistribution: finalStats
          }
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    if (searchParams.get('migrate') === 'status-column') {
      const { prisma } = await import('@/shared/database/prisma');

      try {
        // Check if status column exists
        const columns = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'feed_items'
          AND table_schema = 'public'
          AND column_name = 'status'
        `;

        if ((columns as any[]).length === 0) {
          // Add status column
          await prisma.$executeRaw`
            ALTER TABLE feed_items
            ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
          `;

          // Migrate data
          await prisma.$executeRaw`
            UPDATE feed_items
            SET status = CASE
              WHEN processed = true THEN 'processed'
              ELSE 'pending'
            END
          `;

          // Create index
          await prisma.$executeRaw`
            CREATE INDEX IF NOT EXISTS idx_feed_items_status
            ON feed_items(status)
          `;

          return NextResponse.json({
            migration: 'completed',
            message: 'Status column added and data migrated successfully'
          });
        } else {
          return NextResponse.json({
            migration: 'already_applied',
            message: 'Status column already exists'
          });
        }
      } catch (error) {
        return NextResponse.json({
          migration: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Reset source error status utility
    if (searchParams.get('fix') === 'reset-error') {
      const { prisma } = await import('@/shared/database/prisma');

      try {
        // Reset error status for sources that have error status but working URLs
        const updated = await prisma.source.updateMany({
          where: {
            status: 'error'
          },
          data: {
            status: 'active',
            lastError: null,
            lastErrorAt: null
          }
        });

        return NextResponse.json({
          success: true,
          message: `Reset error status for ${updated.count} sources`,
          sourcesFixed: updated.count
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Initialize the sources container
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Parse query parameters (reusing searchParams from migration check)
    // const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;

    // Execute use case
    const result = await sourcesAdminFacade.getSources({
      page,
      limit,
      type: type as any,
      status: status as any,
    });

    if (result.isFailure()) {
      console.error('Error getting sources:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.value);

  } catch (error) {
    console.error('Error in sources endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sources
 * Creates a new source
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize the sources container
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Execute use case
    const result = await sourcesAdminFacade.createSource({
      name: body.name,
      type: body.type,
      url: body.url,
      defaultCategory: body.defaultCategory,
      configuration: body.configuration || {},
      metadata: body.metadata || {},
      testConnection: body.testConnection || false,
    });

    if (result.isFailure()) {
      console.error('Error creating source:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    console.log('✅ Source created successfully:', result.value.source);

    return NextResponse.json({
      success: true,
      message: `Source "${body.name}" created successfully`,
      source: result.value.source
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create source endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}