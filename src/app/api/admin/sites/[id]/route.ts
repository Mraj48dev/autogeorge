import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface RouteContext {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = 'temp-user-id';
    const { id: siteId } = params;
    const body = await request.json();

    // Direct Prisma update
    const site = await prisma.wordPressSite.update({
      where: {
        id: siteId,
        userId: userId // Ensure user owns the site
      },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        site: {
          id: site.id,
          userId: site.userId,
          name: site.name,
          url: site.url,
          username: site.username,
          password: site.password,
          defaultCategory: site.defaultCategory,
          defaultStatus: site.defaultStatus,
          defaultAuthor: site.defaultAuthor,
          enableAutoPublish: site.enableAutoPublish,
          enableFeaturedImage: site.enableFeaturedImage,
          enableTags: site.enableTags,
          enableCategories: site.enableCategories,
          customFields: site.customFields,
          isActive: site.isActive,
          lastPublishAt: site.lastPublishAt?.toISOString(),
          lastError: site.lastError,
          createdAt: site.createdAt.toISOString(),
          updatedAt: site.updatedAt.toISOString(),
          enableAutoGeneration: site.enableAutoGeneration
        }
      }
    });

  } catch (error) {
    console.error('PUT /api/admin/sites/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = 'temp-user-id';
    const { id: siteId } = params;

    // Direct Prisma delete
    await prisma.wordPressSite.delete({
      where: {
        id: siteId,
        userId: userId // Ensure user owns the site
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/admin/sites/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}