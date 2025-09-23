import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test simple article count
    const articleCount = await prisma.article.count();

    // Test simple find many
    const articles = await prisma.article.findMany({
      take: 5,
      include: {
        source: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      articleCount,
      articles: articles.map(article => ({
        id: article.id,
        title: article.title,
        status: article.status,
        sourceId: article.sourceId,
        sourceName: article.source?.name || 'Unknown',
        createdAt: article.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Test articles error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}