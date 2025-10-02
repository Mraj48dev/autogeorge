import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      settings: wordpressSite ? {
        id: wordpressSite.id,
        name: wordpressSite.name,
        isActive: wordpressSite.isActive,
        enableAutoGeneration: wordpressSite.enableAutoGeneration,
        enableAutoPublish: wordpressSite.enableAutoPublish,
        enableFeaturedImage: wordpressSite.enableFeaturedImage
      } : null
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}