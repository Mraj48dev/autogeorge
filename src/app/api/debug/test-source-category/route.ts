import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * DEBUG endpoint per testare il salvataggio delle categorie nelle sources
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [DEBUG] Starting source category test...');

    // Test 1: Check direct database access
    console.log('🔍 [DEBUG] Test 1: Check existing sources with categories');
    const existingSources = await prisma.source.findMany({
      select: {
        id: true,
        name: true,
        defaultCategory: true,
        type: true
      }
    });

    console.log('📊 [DEBUG] Existing sources:', existingSources);

    // Test 2: Create test source with category via container
    console.log('🔍 [DEBUG] Test 2: Create test source via SourcesContainer');
    const container = createSourcesContainer();
    const sourcesAdminFacade = container.sourcesAdminFacade;

    const testSourceName = `TestSource_${Date.now()}`;
    const testCategory = 'TestCategory';

    const createResult = await sourcesAdminFacade.createSource({
      name: testSourceName,
      type: 'rss',
      url: 'https://example.com/rss',
      defaultCategory: testCategory,
      configuration: {},
      metadata: {},
      testConnection: false
    });

    console.log('✅ [DEBUG] Create result:', {
      success: createResult.isSuccess(),
      error: createResult.isFailure() ? createResult.error.message : null
    });

    if (createResult.isSuccess()) {
      const sourceId = createResult.value.source.id;
      console.log('📝 [DEBUG] Created source ID:', sourceId);

      // Test 3: Verify in database directly
      console.log('🔍 [DEBUG] Test 3: Check in database directly');
      const dbSource = await prisma.source.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          name: true,
          defaultCategory: true,
          type: true
        }
      });

      console.log('📊 [DEBUG] Source in database:', dbSource);

      // Test 4: Get via container
      console.log('🔍 [DEBUG] Test 4: Get via container');
      const getResult = await sourcesAdminFacade.getSources({});

      if (getResult.isSuccess()) {
        const containerSource = getResult.value.sources.find(s => s.id === sourceId);
        console.log('📊 [DEBUG] Source via container:', {
          id: containerSource?.id,
          name: containerSource?.name,
          defaultCategory: containerSource?.defaultCategory,
          type: containerSource?.type
        });
      }

      // Test 5: Update category via container
      console.log('🔍 [DEBUG] Test 5: Update category via container');
      const updateResult = await sourcesAdminFacade.updateSource({
        sourceId: sourceId,
        name: testSourceName,
        defaultCategory: 'UpdatedCategory'
      });

      console.log('✅ [DEBUG] Update result:', {
        success: updateResult.isSuccess(),
        error: updateResult.isFailure() ? updateResult.error.message : null
      });

      if (updateResult.isSuccess()) {
        // Test 6: Verify update in database
        console.log('🔍 [DEBUG] Test 6: Check updated source in database');
        const updatedDbSource = await prisma.source.findUnique({
          where: { id: sourceId },
          select: {
            id: true,
            name: true,
            defaultCategory: true,
            type: true
          }
        });

        console.log('📊 [DEBUG] Updated source in database:', updatedDbSource);
      }

      // Cleanup: Delete test source
      console.log('🧹 [DEBUG] Cleanup: Deleting test source');
      await prisma.source.delete({
        where: { id: sourceId }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Source category test completed',
      data: {
        existingSources,
        testResults: {
          createSuccess: createResult.isSuccess(),
          createError: createResult.isFailure() ? createResult.error.message : null
        }
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Source category test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check server logs for more details'
    }, { status: 500 });
  }
}