import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/monitor-generation
 * Lista tutti i record di monitor_generation con filtri opzionali
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sourceId = searchParams.get('sourceId');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Costruisci il filtro WHERE
    const where: any = {};
    if (status) where.status = status;
    if (sourceId) where.sourceId = sourceId;
    if (priority) where.priority = priority;

    // Query per ottenere i record (prima senza relazioni per debug)
    console.log('🔍 [DEBUG] Querying monitors with where:', where);

    const [monitors, totalCount] = await Promise.all([
      prisma.monitorGeneration.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' }  // Solo ordinamento per data
        ],
        take: limit,
        skip: offset
      }),
      prisma.monitorGeneration.count({ where })
    ]);

    console.log(`📊 [DEBUG] Found ${monitors.length} monitors, ${totalCount} total`);

    // Statistiche semplici senza groupBy per ora
    const stats = {
      total: totalCount,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0
      }
    };

    console.log(`📊 Monitor Generation Query: ${monitors.length} records found, ${totalCount} total`);

    return NextResponse.json({
      success: true,
      data: {
        monitors: monitors.map(m => ({
          ...m,
          source: { name: m.sourceName }, // Mock relation per ora
          feedItem: { processed: false }   // Mock relation per ora
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching monitor generation records:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch monitor generation records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/monitor-generation
 * Elimina record completati o falliti più vecchi di N giorni
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const status = searchParams.get('status') || 'completed';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deleteResult = await prisma.monitorGeneration.deleteMany({
      where: {
        status,
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`🗑️ Deleted ${deleteResult.count} monitor generation records older than ${days} days with status: ${status}`);

    return NextResponse.json({
      success: true,
      data: {
        deleted: deleteResult.count,
        cutoffDate: cutoffDate.toISOString(),
        status
      }
    });

  } catch (error) {
    console.error('❌ Error cleaning up monitor generation records:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clean up monitor generation records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}