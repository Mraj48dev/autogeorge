import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 GET /api/admin/sites - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    // Get user's sites only
    const sites = await prisma.wordPressSite.findMany({
      where: { userId: user.userId },
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
      sites: sitesWithStats.map(s => ({
        id: s.site.id,
        name: s.site.name,
        url: s.site.url,
        isActive: s.site.isActive,
        createdAt: s.site.createdAt,
        updatedAt: s.site.updatedAt
      })),
      totalSites: sites.length
    });

  } catch (error) {
    console.error('GET /api/admin/sites error:', error);

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

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 POST /api/admin/sites - Starting authentication...');

    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

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

    // Create site with user association
    const site = await prisma.wordPressSite.create({
      data: {
        userId: user.userId,
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
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        isActive: site.isActive,
        createdAt: site.createdAt.toISOString(),
        updatedAt: site.updatedAt.toISOString()
      },
      connectionTest: {
        success: true,
        message: 'Site created successfully'
      }
    });

  } catch (error) {
    console.error('POST /api/admin/sites error:', error);

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