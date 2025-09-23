import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles-by-source-simple
 * Simple articles by source endpoint for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Get all articles with source info
    const articles = await prisma.article.findMany({
      include: {
        source: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        articles: articles.map(article => ({
          id: article.id,
          title: article.title,
          status: article.status,
          sourceId: article.sourceId,
          sourceName: article.source?.name || 'Unknown',
          createdAt: article.createdAt.toISOString()
        })),
        total: articles.length
      }
    });

  } catch (error) {
    console.error('Simple articles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}