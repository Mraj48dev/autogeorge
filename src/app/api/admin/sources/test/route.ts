import { NextRequest, NextResponse } from 'next/server';
import { getSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * POST /api/admin/sources/test
 * Tests a source configuration without saving it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required for testing' },
        { status: 400 }
      );
    }

    const container = getSourcesContainer();
    const result = await container.sourcesAdminFacade.testSource({
      name: body.name,
      type: body.type,
      url: body.url,
      configuration: body.configuration,
      testConnection: true,
    });

    if (result.isFailure()) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
          testResult: 'failed'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Source test completed successfully',
      testResult: 'passed',
      data: result.value
    });

  } catch (error) {
    console.error('Error testing source:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        testResult: 'failed'
      },
      { status: 500 }
    );
  }
}