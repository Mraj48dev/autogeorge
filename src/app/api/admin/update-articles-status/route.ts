import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/update-articles-status
 * Emergency endpoint to update articles from 'generated' to 'ready_to_publish'
 * for testing the separated workflow
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [Emergency] Updating articles status for testing...');

    // Update first 5 'generated' articles to 'ready_to_publish'
    const updatedArticles = await prisma.article.updateMany({
      where: {
        status: 'generated'
      },
      data: {
        status: 'ready_to_publish'
      }
    });

    console.log(`✅ Updated ${updatedArticles.count} articles from 'generated' to 'ready_to_publish'`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedArticles.count} articles to ready_to_publish status`,
      updatedCount: updatedArticles.count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating articles status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update articles status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}