import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/update-site-flags
 * Updates automation flags for WordPress site
 */
export async function POST(request: NextRequest) {
  try {
    const { siteId, enableAutoGeneration, enableAutoPublish, enableFeaturedImage, isActive } = await request.json();

    if (!siteId) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    // Update WordPress site automation flags
    const updatedSite = await prisma.wordPressSite.update({
      where: { id: siteId },
      data: {
        enableAutoGeneration: enableAutoGeneration !== undefined ? enableAutoGeneration : undefined,
        enableAutoPublish: enableAutoPublish !== undefined ? enableAutoPublish : undefined,
        enableFeaturedImage: enableFeaturedImage !== undefined ? enableFeaturedImage : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    return NextResponse.json({
      success: true,
      site: updatedSite,
      message: 'Site automation flags updated successfully'
    });

  } catch (error) {
    console.error('Error updating site flags:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}