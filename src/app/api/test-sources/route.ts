import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * Test endpoint for Sources Module (bypasses authentication)
 * Used to test multi-tenant functionality
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Sources Module Multi-tenant');

    // Simulate user ID for testing
    const testUserId = 'test-user-123';

    // Get query parameters for pagination/filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Create sources container and get facade
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Test: Get sources with user filtering
    const result = await sourcesAdminFacade.getSources({
      userId: testUserId, // Multi-tenant filtering
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    if (result.isFailure()) {
      console.error('❌ Failed to get sources:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error.message,
        test: 'Sources module test'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      test: 'Sources module multi-tenant test',
      userId: testUserId,
      data: result.value,
      message: 'Sources Module is working with multi-tenant filtering!'
    });

  } catch (error) {
    console.error('❌ Error in sources test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test: 'Sources module test'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Sources Creation Multi-tenant');

    // Simulate user ID for testing
    const testUserId = 'test-user-123';

    // Parse request body
    const body = await request.json();

    // Create sources container and get facade
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    // Test: Create source with user association
    const result = await sourcesAdminFacade.createSource({
      name: body.name || 'Test RSS Feed',
      type: 'rss',
      url: body.url || 'https://example.com/feed.xml',
      userId: testUserId, // Multi-tenant association
      testConnection: false
    });

    if (result.isFailure()) {
      console.error('❌ Failed to create source:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error.message,
        test: 'Sources creation test'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      test: 'Sources creation multi-tenant test',
      userId: testUserId,
      data: result.value,
      message: 'Source created successfully with user association!'
    });

  } catch (error) {
    console.error('❌ Error in sources creation test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test: 'Sources creation test'
    }, { status: 500 });
  }
}