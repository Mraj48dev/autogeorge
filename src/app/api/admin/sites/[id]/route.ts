import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { requireAuth, verifyResourceOwnership } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

// Common function for updating site settings
async function updateSite(request: NextRequest, { params }: RouteContext) {
  try {
    console.log('🔐 PUT /api/admin/sites/[id] - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const { id: siteId } = params;
    const body = await request.json();

    // Verify site ownership
    const hasAccess = await verifyResourceOwnership(user.userId, 'site', siteId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 404 }
      );
    }

    // Direct Prisma update
    const site = await prisma.wordPressSite.update({
      where: {
        id: siteId,
        userId: user.userId // Ensure user owns the site
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

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export PUT and PATCH handlers that use the same logic
export async function PUT(request: NextRequest, context: RouteContext) {
  return updateSite(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateSite(request, context);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    console.log('🔐 DELETE /api/admin/sites/[id] - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const { id: siteId } = params;

    // Verify site ownership
    const hasAccess = await verifyResourceOwnership(user.userId, 'site', siteId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 404 }
      );
    }

    // Direct Prisma delete
    await prisma.wordPressSite.delete({
      where: {
        id: siteId,
        userId: user.userId // Ensure user owns the site
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/admin/sites/[id] error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}