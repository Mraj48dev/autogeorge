import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 [AutoGeneration] Starting...');

    // Simple test - check if WordPress site exists and auto-generation is enabled
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite || !wordpressSite.enableAutoGeneration) {
      return NextResponse.json({
        success: true,
        message: 'Auto-generation disabled or no active site',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    console.log('✅ Auto-generation enabled');

    // Simple test - count feed items that need processing
    const feedItemCount = await prisma.feedItem.count({
      where: { articleId: null }
    });

    console.log(`📊 Found ${feedItemCount} feed items needing processing`);

    if (feedItemCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No feed items to process',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    // For now, just return count without processing to test basic functionality
    return NextResponse.json({
      success: true,
      message: `Found ${feedItemCount} feed items ready for processing`,
      results: { processed: 0, successful: 0, failed: 0, feedItemsFound: feedItemCount }
    });

  } catch (error) {
    console.error('💥 Error in auto-generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}