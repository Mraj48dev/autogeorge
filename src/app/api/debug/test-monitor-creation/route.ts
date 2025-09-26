import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/debug/test-monitor-creation
 * Testa la creazione diretta di record MonitorGeneration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Testing monitor generation record creation...');

    // 1. Trova una source con autoGenerate = true
    const sources = await prisma.source.findMany({
      where: {
        status: 'active'
      }
    });

    console.log(`📋 Found ${sources.length} sources`);

    const autoGenSources = sources.filter(source => {
      const config = source.configuration as any;
      return config?.autoGenerate === true;
    });

    console.log(`🤖 Found ${autoGenSources.length} sources with autoGenerate enabled`);

    if (autoGenSources.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No sources with autoGenerate = true found',
        availableSources: sources.map(s => ({
          id: s.id,
          name: s.name,
          configuration: s.configuration
        }))
      });
    }

    // 2. Usa la prima source con autoGenerate
    const testSource = autoGenSources[0];
    console.log(`📡 Using source: ${testSource.name} (${testSource.id})`);

    // 3. Trova un feed item recente non processato
    const feedItems = await prisma.feedItem.findMany({
      where: {
        sourceId: testSource.id,
        processed: false
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: 5
    });

    console.log(`📰 Found ${feedItems.length} unprocessed feed items`);

    if (feedItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No unprocessed feed items found for auto-generation source'
      });
    }

    // 4. Testa la creazione di un monitor record
    const testFeedItem = feedItems[0];
    console.log(`🎯 Creating monitor record for feed item: ${testFeedItem.title}`);

    // 5. Verifica che non esista già un monitor per questo feed item
    const existingMonitor = await prisma.monitorGeneration.findUnique({
      where: {
        feedItemId: testFeedItem.id
      }
    });

    if (existingMonitor) {
      return NextResponse.json({
        success: true,
        message: 'Monitor record already exists for this feed item',
        data: {
          existingMonitor,
          feedItem: testFeedItem
        }
      });
    }

    // 6. Crea il monitor record
    const monitorRecord = await prisma.monitorGeneration.create({
      data: {
        feedItemId: testFeedItem.id,
        sourceId: testSource.id,
        sourceName: testSource.name,
        title: testFeedItem.title,
        content: testFeedItem.content,
        url: testFeedItem.url,
        publishedAt: testFeedItem.publishedAt,
        status: 'pending',
        priority: 'normal',
        metadata: {
          testCreation: true,
          originalGuid: testFeedItem.guid,
          fetchedAt: testFeedItem.fetchedAt.toISOString()
        }
      }
    });

    console.log(`✅ [DEBUG] Monitor record created successfully: ${monitorRecord.id}`);

    // 7. Verifica che sia stato creato
    const verificationQuery = await prisma.monitorGeneration.findUnique({
      where: {
        id: monitorRecord.id
      },
      include: {
        source: true,
        feedItem: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Monitor generation record created successfully',
      data: {
        created: monitorRecord,
        verification: verificationQuery,
        sourceInfo: {
          id: testSource.id,
          name: testSource.name,
          autoGenerate: (testSource.configuration as any)?.autoGenerate
        }
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error testing monitor creation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Monitor creation test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/test-monitor-creation
 * Lista le informazioni di debug per monitor generation
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Getting monitor generation debug info...');

    // Query per debug info
    const [sources, feedItems, monitorCount, recentMonitors] = await Promise.all([
      // Sources con autoGenerate
      prisma.source.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          configuration: true,
          _count: {
            select: {
              feedItems: true
            }
          }
        }
      }),
      // Feed items non processati
      prisma.feedItem.findMany({
        where: {
          processed: false
        },
        select: {
          id: true,
          sourceId: true,
          title: true,
          publishedAt: true
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: 10
      }),
      // Count totale monitor
      prisma.monitorGeneration.count(),
      // Ultimi monitor creati
      prisma.monitorGeneration.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        include: {
          source: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // Analizza sources con autoGenerate
    const autoGenAnalysis = sources.map(source => ({
      id: source.id,
      name: source.name,
      status: source.status,
      feedItemCount: source._count.feedItems,
      configuration: source.configuration,
      hasAutoGenerate: !!(source.configuration as any)?.autoGenerate
    }));

    const autoGenEnabledCount = autoGenAnalysis.filter(s => s.hasAutoGenerate).length;

    return NextResponse.json({
      success: true,
      debug: {
        totalSources: sources.length,
        autoGenEnabledSources: autoGenEnabledCount,
        unprocessedFeedItems: feedItems.length,
        totalMonitorRecords: monitorCount,
        recentMonitors: recentMonitors.length
      },
      data: {
        autoGenSources: autoGenAnalysis.filter(s => s.hasAutoGenerate),
        allSources: autoGenAnalysis,
        unprocessedItems: feedItems,
        recentMonitors
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error getting debug info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}