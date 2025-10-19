import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock endpoint for testing Sources UI without authentication
 * This bypasses all authentication and Prisma issues for pure frontend testing
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Mock Sources GET request');

    // Return mock data without any authentication
    const mockSources = [
      {
        id: 'mock-source-1',
        name: 'TechCrunch RSS (Mock)',
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
        id: 'mock-source-2',
        name: 'Sports News (Mock)',
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
      message: `Mock data: ${mockSources.length} sources returned`,
      mock: true
    });

  } catch (error) {
    console.error('❌ Error in mock sources API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mock: true
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Mock Sources POST request');

    // Parse request body
    const body = await request.json();

    // Simulate successful creation
    const mockCreatedSource = {
      id: `mock-source-${Date.now()}`,
      name: body.name,
      type: body.type,
      status: 'active',
      url: body.url,
      defaultCategory: body.defaultCategory,
      createdAt: new Date().toISOString(),
      configuration: body.configuration,
      mock: true
    };

    return NextResponse.json({
      success: true,
      source: mockCreatedSource,
      message: `Mock source "${body.name}" created successfully`,
      mock: true
    });

  } catch (error) {
    console.error('❌ Error in mock sources creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mock: true
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧪 Mock Sources DELETE request');

    return NextResponse.json({
      success: true,
      message: 'Mock source deleted successfully',
      mock: true
    });

  } catch (error) {
    console.error('❌ Error in mock sources deletion:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mock: true
    }, { status: 500 });
  }
}