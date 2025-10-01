import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Get featured image for specific article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { articleId: string } }
) {
  try {
    const { articleId } = params;

    // Query featured_images table directly
    const featuredImage = await prisma.$queryRaw`
      SELECT * FROM featured_images
      WHERE "articleId" = ${articleId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    console.log('🔍 [DEBUG] Featured image query result:', {
      articleId,
      result: featuredImage
    });

    return NextResponse.json({
      success: true,
      articleId,
      featuredImage: Array.isArray(featuredImage) ? featuredImage[0] : null
    });

  } catch (error) {
    console.error('❌ [DEBUG] Featured image query failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch featured image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}