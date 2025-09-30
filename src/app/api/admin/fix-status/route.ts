import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * FIX FEED ITEMS STATUS
 * Correct the status field based on actual data conditions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Analyzing current status distribution...');

    // Check current status distribution
    const statusStats = await prisma.feedItem.groupBy({
      by: ['status'],
      _count: true
    });

    // Check items that have articleId but wrong status
    const itemsWithArticles = await prisma.feedItem.findMany({
      where: {
        articleId: { not: null },
        status: { not: 'processed' }
      },
      select: {
        id: true,
        status: true,
        articleId: true,
        processed: true
      }
    });

    // Check if we need to apply WordPress settings logic
    const wordPressSite = await prisma.wordPressSite.findFirst({
      select: { enableAutoGeneration: true }
    });

    return NextResponse.json({
      success: true,
      analysis: {
        currentStatusDistribution: statusStats,
        itemsWithArticlesInWrongStatus: itemsWithArticles.length,
        itemsWithArticlesDetails: itemsWithArticles,
        wordPressAutoGeneration: wordPressSite?.enableAutoGeneration || false,
        recommendedAction: itemsWithArticles.length > 0 ? 'fix_required' : 'no_action_needed'
      }
    });

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting status correction...');

    // Step 1: Fix items that have articleId - they should be 'processed'
    const articlesFixed = await prisma.feedItem.updateMany({
      where: {
        articleId: { not: null },
        status: { not: 'processed' }
      },
      data: {
        status: 'processed'
      }
    });

    console.log(`✅ Fixed ${articlesFixed.count} items with articles to 'processed'`);

    // Step 2: Set correct initial status for items without articles based on WordPress settings
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

    console.log(`✅ Fixed ${itemsWithoutArticles.count} items without articles to '${targetStatus}'`);

    // Step 3: Get final status distribution
    const finalStats = await prisma.feedItem.groupBy({
      by: ['status'],
      _count: true
    });

    return NextResponse.json({
      success: true,
      message: 'Status correction completed successfully',
      changes: {
        itemsWithArticlesFixed: articlesFixed.count,
        itemsWithoutArticlesFixed: itemsWithoutArticles.count,
        newTargetStatusForNewItems: targetStatus,
        finalDistribution: finalStats
      }
    });

  } catch (error) {
    console.error('❌ Status correction failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}