import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = 'temp-user-id';

    // Direct Prisma query for now
    const sites = await prisma.wordPressSite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Convert to expected format
    const sitesWithStats = sites.map(site => ({
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
      },
      statistics: {
        totalSources: 0,
        totalArticles: 0,
        articlesPublished: 0,
        articlesPending: 0,
        isPublishing: false
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        sites: sitesWithStats,
        totalSites: sites.length
      }
    });

  } catch (error) {
    console.error('GET /api/admin/sites error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = 'temp-user-id';

    const body = await request.json();
    const {
      name,
      url,
      username,
      password,
      defaultCategory,
      defaultStatus = 'draft',
      defaultAuthor,
      enableAutoPublish = false,
      enableFeaturedImage = true,
      enableTags = true,
      enableCategories = true,
      customFields,
      enableAutoGeneration = false
    } = body;

    // Validation
    if (!name || !url || !username || !password) {
      return NextResponse.json({
        error: 'Missing required fields: name, url, username, password'
      }, { status: 400 });
    }

    // Direct Prisma create
    const site = await prisma.wordPressSite.create({
      data: {
        userId,
        name,
        url,
        username,
        password,
        defaultCategory,
        defaultStatus,
        defaultAuthor,
        enableAutoPublish,
        enableFeaturedImage,
        enableTags,
        enableCategories,
        customFields,
        enableAutoGeneration
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
        },
        connectionTest: { warnings: [] }
      }
    });

  } catch (error) {
    console.error('POST /api/admin/sites error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}