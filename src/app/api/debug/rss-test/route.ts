import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * TEMPORARY DEBUG ENDPOINT
 * Test RSS parsing and saving for troubleshooting
 */
export async function GET(request: NextRequest) {
  try {
    const container = createSourcesContainer();
    const testSourceId = 'cmfzyrmw5jbbfpd8c'; // Test site source

    console.log('=== DEBUG RSS TEST START ===');

    // Get the source
    const getSourceResult = await container.sourcesAdminFacade.getSources({
      limit: 1,
      sourceId: testSourceId
    });

    if (getSourceResult.isFailure()) {
      return NextResponse.json({
        error: 'Failed to get source',
        details: getSourceResult.error.message
      });
    }

    const source = getSourceResult.value.sources[0];
    if (!source) {
      return NextResponse.json({ error: 'Source not found' });
    }

    console.log('Source found:', source.name, source.url);

    // Test fetch
    const fetchResult = await container.sourcesAdminFacade.fetchFromSource({
      sourceId: testSourceId,
      force: true
    });

    console.log('Fetch result:', fetchResult.isSuccess() ? 'SUCCESS' : 'FAILED');

    if (fetchResult.isSuccess()) {
      const result = fetchResult.value;
      return NextResponse.json({
        success: true,
        debug: {
          sourceId: testSourceId,
          sourceName: source.name,
          sourceUrl: source.url,
          fetchedItems: result.fetchedItems,
          newItems: result.newItems,
          duration: result.duration,
          message: result.message,
          metadata: result.metadata
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: fetchResult.error.message
      });
    }

  } catch (error) {
    console.error('Debug RSS test error:', error);
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}