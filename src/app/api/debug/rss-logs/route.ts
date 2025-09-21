import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * GET /api/debug/rss-logs
 * Endpoint per ottenere i log dettagliati del monitoraggio RSS
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient();

    try {
      // Ottieni informazioni dettagliate sui sources
      const sources = await prisma.source.findMany({
        where: {
          type: 'rss',
          url: {
            not: null
          }
        },
        include: {
          feedItems: {
            take: 5,
            orderBy: {
              publishedAt: 'desc'
            }
          }
        },
        orderBy: {
          lastFetchAt: 'desc'
        }
      });

      // Ottieni statistiche generali
      const totalFeedItems = await prisma.feedItem.count();
      const unprocessedItems = await prisma.feedItem.count({
        where: { processed: false }
      });

      // Ottieni il conteggio reale degli articoli per ogni source
      const sourceDetails = await Promise.all(sources.map(async (source) => {
        const totalItems = await prisma.feedItem.count({
          where: { sourceId: source.id }
        });

        return {
          id: source.id,
          name: source.name,
          url: source.url,
          status: source.status,
          lastFetchAt: source.lastFetchAt,
          lastError: source.lastError,
          lastErrorAt: source.lastErrorAt,
          totalItems,
          recentItems: source.feedItems.map(item => ({
            id: item.id,
            title: item.title,
            publishedAt: item.publishedAt,
            fetchedAt: item.fetchedAt,
            processed: item.processed
          }))
        };
      }));

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          totalSources: sources.length,
          activeSources: sources.filter(s => s.status === 'active').length,
          sourcesWithErrors: sources.filter(s => s.lastError).length,
          totalFeedItems,
          unprocessedItems
        },
        sources: sourceDetails,
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: `Monitoring ${sources.length} RSS sources`,
            details: {
              activeSources: sources.filter(s => s.status === 'active').length,
              lastActivity: sources[0]?.lastFetchAt || 'Never'
            }
          }
        ]
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Error in RSS logs endpoint:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve RSS monitoring logs',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/debug/rss-logs
 * Endpoint per aggiungere log personalizzati (per test)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, level = 'INFO', details } = body;

    // Per ora salviamo solo un log di debug
    console.log(`[RSS-DEBUG] ${level}: ${message}`, details);

    return NextResponse.json({
      success: true,
      message: 'Debug log recorded',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to record debug log'
    }, { status: 500 });
  }
}