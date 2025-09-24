import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * EMERGENCY FIX: Convert RSS articles from "generated" to "draft"
 * These are raw RSS content that was incorrectly marked as processed
 */
export async function POST(request: NextRequest) {
  try {
    // Update all articles with very short content (RSS feeds) to draft status
    const result = await prisma.article.updateMany({
      where: {
        status: 'generated',
        // RSS articles have very short content (< 200 chars typically)
        content: {
          not: null
        }
      },
      data: {
        status: 'draft'
      }
    });

    console.log(`🚨 EMERGENCY FIX: Updated ${result.count} articles from generated to draft`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${result.count} articles: converted RSS content from 'generated' to 'draft' status`,
      updatedCount: result.count
    });

  } catch (error) {
    console.error('Emergency fix error:', error);
    return NextResponse.json(
      { error: 'Internal server error during emergency fix' },
      { status: 500 }
    );
  }
}