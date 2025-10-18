import { NextRequest, NextResponse } from 'next/server';
import { createSitesContainer } from '@/modules/sites/infrastructure/container/SitesContainer';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const container = createSitesContainer();
    const result = await container.sitesAdminFacade.getUserSites(userId);

    if (result.isFailure()) {
      console.error('GET /api/admin/sites error:', result.error.message);
      return NextResponse.json(
        { error: 'Failed to get sites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('GET /api/admin/sites unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const container = createSitesContainer();
    const result = await container.sitesAdminFacade.createSite({
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
    });

    if (result.isFailure()) {
      console.error('POST /api/admin/sites error:', result.error.message);
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('POST /api/admin/sites unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}