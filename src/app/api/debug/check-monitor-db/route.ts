import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/debug/check-monitor-db
 * Direct database query to check if monitor records actually exist
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Checking monitor_generation table directly...');

    // Query diretta senza filtri
    const allMonitors = await prisma.$queryRaw`SELECT * FROM monitor_generation ORDER BY created_at DESC LIMIT 10`;

    console.log('📋 [DEBUG] Raw query result:', allMonitors);

    // Query con findMany semplice
    const findManyResult = await prisma.monitorGeneration.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📋 [DEBUG] findMany result:', findManyResult);

    // Controlla se la tabella esiste
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'monitor_generation'
      ORDER BY ordinal_position
    `;

    console.log('🏗️ [DEBUG] Table schema:', tableInfo);

    // Count totale
    const totalCount = await prisma.monitorGeneration.count();

    console.log('📊 [DEBUG] Total monitor records count:', totalCount);

    return NextResponse.json({
      success: true,
      debug: {
        totalCount,
        rawQueryRecords: Array.isArray(allMonitors) ? allMonitors.length : 0,
        findManyRecords: findManyResult.length,
        tableExists: Array.isArray(tableInfo) && tableInfo.length > 0
      },
      data: {
        rawQuery: allMonitors,
        findMany: findManyResult,
        schema: tableInfo
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error checking monitor DB:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug/check-monitor-db
 * Creates a simple test monitor record to verify database works
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Creating simple test monitor record...');

    // Prima trova un feed item qualsiasi
    const feedItem = await prisma.feedItem.findFirst({
      take: 1,
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!feedItem) {
      return NextResponse.json({
        success: false,
        error: 'No feed items found to create test monitor'
      });
    }

    // Trova la source di questo feed item
    const source = await prisma.source.findUnique({
      where: { id: feedItem.sourceId }
    });

    if (!source) {
      return NextResponse.json({
        success: false,
        error: 'Source not found for feed item'
      });
    }

    // Crea record monitor MOLTO semplice
    const testMonitor = await prisma.monitorGeneration.create({
      data: {
        feedItemId: feedItem.id,
        sourceId: source.id,
        sourceName: source.name || 'Test Source',
        title: `TEST MONITOR: ${feedItem.title}`,
        content: feedItem.content || 'Test content',
        url: feedItem.url,
        publishedAt: feedItem.publishedAt,
        status: 'pending',
        priority: 'normal'
      }
    });

    console.log('✅ [DEBUG] Test monitor created:', testMonitor.id);

    // Verifica che sia stato creato
    const verification = await prisma.monitorGeneration.findUnique({
      where: { id: testMonitor.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Test monitor record created',
      data: {
        created: testMonitor,
        verification,
        feedItemUsed: feedItem,
        sourceUsed: source
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error creating test monitor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test monitor creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}