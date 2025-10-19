import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Debug endpoint to check database schema in production
 */
export async function GET(request: NextRequest) {
  try {
    // Query to check the sources table schema
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'sources'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    // Also try to query a single source without userId filter to see what fields exist
    const firstSource = await prisma.source.findFirst({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      debug: {
        schema_columns: columns,
        sample_source: firstSource,
        message: 'Database schema verification'
      }
    });

  } catch (error) {
    console.error('❌ Error in schema debug:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: 'schema verification'
    }, { status: 500 });
  }
}