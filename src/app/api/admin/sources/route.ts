import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/sources
 * Lists all sources with pagination and filtering
 * TEMPORARY MOCK VERSION - Database issues workaround
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 USING MOCK SOURCES API - Database bypass active');

    // Mock empty sources list for now
    const mockResponse = {
      sources: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      }
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Error in mock sources endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sources
 * Creates a new source
 * TEMPORARY MOCK VERSION - Database issues workaround
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 USING MOCK CREATE SOURCE API - Database bypass active');

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Mock successful creation
    const mockCreatedSource = {
      id: `mock-${Date.now()}`,
      name: body.name,
      type: body.type,
      status: 'active',
      url: body.url,
      configuration: body.configuration || {},
      metadata: {
        totalFetches: 0,
        totalItems: 0,
        lastFetchResult: null
      },
      lastFetchAt: null,
      lastErrorAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('✅ Mock source created:', mockCreatedSource);

    return NextResponse.json({
      success: true,
      message: `Source "${body.name}" created successfully (MOCK MODE)`,
      source: mockCreatedSource
    }, { status: 201 });

  } catch (error) {
    console.error('Error in mock create source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}