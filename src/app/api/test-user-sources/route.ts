import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Test endpoint for user sources - bypasses Prisma cache issues
 * This simulates the multi-tenant Sources API until Prisma client is regenerated
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Simulate user's sources data
    const mockSources = [
      {
        id: 'source-1',
        name: 'TechCrunch RSS',
        type: 'rss',
        status: 'active',
        url: 'https://techcrunch.com/feed/',
        defaultCategory: 'Tecnologia',
        createdAt: '2024-01-15T10:00:00Z',
        configuration: {
          maxItems: 10,
          pollingInterval: 60,
          enabled: true,
          autoGenerate: true
        },
        metadata: {
          totalFetches: 25,
          totalItems: 120
        }
      },
      {
        id: 'source-2',
        name: 'Sports News',
        type: 'rss',
        status: 'active',
        url: 'https://example.com/sports.xml',
        defaultCategory: 'Sport',
        createdAt: '2024-01-20T14:30:00Z',
        configuration: {
          maxItems: 15,
          pollingInterval: 30,
          enabled: true,
          autoGenerate: false
        },
        metadata: {
          totalFetches: 12,
          totalItems: 85
        }
      }
    ];

    return NextResponse.json({
      success: true,
      sources: mockSources,
      message: `Found ${mockSources.length} sources for user ${userId}`
    });

  } catch (error) {
    console.error('❌ Error in test user sources API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test: 'User sources test endpoint'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Simulate successful creation
    const mockCreatedSource = {
      id: `source-${Date.now()}`,
      name: body.name,
      type: body.type,
      status: 'active',
      url: body.url,
      defaultCategory: body.defaultCategory,
      createdAt: new Date().toISOString(),
      configuration: body.configuration,
      userId: userId
    };

    return NextResponse.json({
      success: true,
      source: mockCreatedSource,
      message: `Source "${body.name}" created successfully for user ${userId}`
    });

  } catch (error) {
    console.error('❌ Error in test user sources creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test: 'User sources creation test'
    }, { status: 500 });
  }
}