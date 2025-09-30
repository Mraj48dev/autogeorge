import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/update-article-status
 * Updates article status for testing workflow
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId, status } = await request.json();

    if (!articleId || !status) {
      return NextResponse.json(
        { error: 'Article ID and status are required' },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ['draft', 'generated', 'generated_image_draft', 'generated_with_image', 'ready_to_publish', 'published', 'failed'];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update article status
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      article: {
        id: updatedArticle.id,
        title: updatedArticle.title,
        status: updatedArticle.status
      },
      message: `Article status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating article status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}