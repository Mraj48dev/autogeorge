import { NextResponse } from 'next/server';

/**
 * GET /api/admin/sources/test
 * Test endpoint that returns mock data without using the database
 */
export async function GET() {
  try {
    // Return mock data to test that the API infrastructure works
    const mockResponse = {
      sources: [
        {
          id: 'test-1',
          name: 'Test RSS Feed',
          type: 'rss',
          status: 'active',
          url: 'https://example.com/rss',
          lastFetchAt: new Date().toISOString(),
          needsAttention: false,
          totalFetches: 10,
          totalItems: 25,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Test endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}