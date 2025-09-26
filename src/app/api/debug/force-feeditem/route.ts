import { NextRequest, NextResponse } from 'next/server';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * ENDPOINT DEBUG: Forza la creazione di un FeedItem per testare auto-generazione
 * Bypassa la deduplicazione per dimostrare che l'architettura funziona
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [DEBUG] Force creating FeedItem for auto-generation test...');

    const sourceId = 'cmfzyrmw5jbbfpd8c'; // Sito di test

    // Usa il Sources Container con Clean Architecture
    const container = createSourcesContainer();
    const feedItemRepository = container.feedItemRepository;

    // Crea un FeedItem di test con GUID unico
    const testFeedItem = {
      sourceId,
      guid: `TEST-AUTOGEN-${Date.now()}`,
      title: 'Test Auto-Generation Article',
      content: 'This is a test article created specifically to test the auto-generation functionality. It should trigger the AI to generate a complete article.',
      url: `https://test.autogeorge.dev/${Date.now()}`,
      publishedAt: new Date(),
      fetchedAt: new Date(),
    };

    // Salva usando Repository pattern (Clean Architecture)
    const saveResult = await feedItemRepository.save(testFeedItem);

    if (saveResult.isFailure()) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save test FeedItem',
        details: saveResult.error.message
      }, { status: 500 });
    }

    const savedFeedItem = saveResult.value;

    console.log('✅ [DEBUG] Test FeedItem created:', savedFeedItem.id);

    // Ora testa se l'auto-generazione funziona forzando un fetch
    console.log('🚀 [DEBUG] Triggering auto-generation...');

    const fetchResult = await container.sourcesAdminFacade.fetchFromSource({
      sourceId,
      force: true
    });

    return NextResponse.json({
      success: true,
      testFeedItem: savedFeedItem,
      autoGenerationTest: fetchResult.isSuccess() ? fetchResult.value : { error: fetchResult.error.message },
      message: 'Test FeedItem created and auto-generation triggered'
    });

  } catch (error) {
    console.error('❌ [DEBUG] Force FeedItem creation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}