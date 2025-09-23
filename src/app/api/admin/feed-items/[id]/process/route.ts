import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PUT /api/admin/feed-items/[id]/process
 * Marks a feed item as processed and optionally links it to an article
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Update feed item as processed
    const updatedFeedItem = await prisma.feedItem.update({
      where: { id },
      data: {
        processed: true,
        articleId: body.articleId || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedFeedItem.id,
        processed: updatedFeedItem.processed,
        articleId: updatedFeedItem.articleId,
        updatedAt: updatedFeedItem.updatedAt
      }
    });

  } catch (error) {
    console.error('Feed item process API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feed-items/[id]/process
 * Marks a feed item as not processed
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Update feed item as not processed
    const updatedFeedItem = await prisma.feedItem.update({
      where: { id },
      data: {
        processed: false,
        articleId: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedFeedItem.id,
        processed: updatedFeedItem.processed,
        articleId: updatedFeedItem.articleId,
        updatedAt: updatedFeedItem.updatedAt
      }
    });

  } catch (error) {
    console.error('Feed item unprocess API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}