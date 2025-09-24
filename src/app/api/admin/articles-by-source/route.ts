import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles-by-source
 * Retrieves articles grouped by source with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const status = searchParams.get('status') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Build where clause
    const where: any = {};

    // Only show processed articles (not draft content from feeds)
    if (status) {
      where.status = status;
    } else {
      // Default: only show articles that have been processed by AI
      where.status = {
        in: ['generated', 'ready_to_publish', 'published', 'failed']
      };
    }

    if (sourceId) where.sourceId = sourceId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Get articles with source information
    const articles = await prisma.article.findMany({
      where,
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
      take: limit,
      skip: offset
    });

    // Group articles by source
    const groupedBySource: Record<string, any> = {};

    articles.forEach(article => {
      const sourceId = article.sourceId || 'unknown';
      const sourceName = article.source?.name || 'Fonte sconosciuta';

      if (!groupedBySource[sourceId]) {
        groupedBySource[sourceId] = {
          sourceId,
          sourceName,
          articles: [],
          totalCount: 0,
          statusCounts: {
            draft: 0,
            generated: 0,
            ready_to_publish: 0,
            published: 0,
            failed: 0
          }
        };
      }

      // Convert article to summary format
      const articleSummary = {
        id: article.id,
        title: article.title,
        excerpt: article.content?.substring(0, 200) + '...' || '',
        status: article.status,
        wordCount: Math.floor((article.content?.length || 0) / 5),
        estimatedReadingTime: Math.ceil(((article.content?.length || 0) / 5) / 200) || 1,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        sourceId: article.sourceId,
        sourceName
      };

      groupedBySource[sourceId].articles.push(articleSummary);
      groupedBySource[sourceId].totalCount++;

      // Update status counts
      const statusCounts = groupedBySource[sourceId].statusCounts;
      const validStatuses = ['draft', 'generated', 'ready_to_publish', 'published', 'failed'];
      if (validStatuses.includes(article.status)) {
        statusCounts[article.status as keyof typeof statusCounts]++;
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.article.count({ where });

    // Generate summary
    const sources = Object.values(groupedBySource);
    const summary = {
      totalArticles: totalCount,
      totalSources: sources.length,
      statusCounts: sources.reduce((acc: any, source: any) => {
        Object.entries(source.statusCounts).forEach(([status, count]) => {
          acc[status] = (acc[status] || 0) + (count as number);
        });
        return acc;
      }, {
        draft: 0,
        generated: 0,
        ready_to_publish: 0,
        published: 0,
        failed: 0
      }),
      mostActiveSource: sources.length > 0
        ? sources.reduce((max: any, source: any) =>
            source.totalCount > max.totalCount ? source : max
          ).sourceName
        : null
    };

    return NextResponse.json({
      success: true,
      data: {
        articlesBySource: groupedBySource,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + articles.length < totalCount
        },
        summary
      }
    });

  } catch (error) {
    console.error('Articles by source API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}