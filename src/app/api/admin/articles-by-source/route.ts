import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles-by-source
 * Retrieves articles grouped by source with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Articles-by-source endpoint called');

    // Simple test - just return articles count first
    const articleCount = await prisma.article.count();

    return NextResponse.json({
      success: true,
      message: 'Articles by source endpoint working',
      articleCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Articles by source API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}