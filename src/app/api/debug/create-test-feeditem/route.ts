import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * ENDPOINT PRAGMATICO: Crea direttamente un FeedItem per testare auto-generazione
 * Bypassa completamente il Sources Module che ha problemi
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 [PRAGMATIC] Creating FeedItem directly to test auto-generation...');

    const sourceId = 'cmfzyrmw5jbbfpd8c'; // Sito di test

    // Elimina eventuali FeedItems esistenti per questa source
    await prisma.feedItem.deleteMany({
      where: { sourceId }
    });

    console.log('🗑️ [PRAGMATIC] Cleared existing FeedItems');

    // Crea un FeedItem di test direttamente
    const testFeedItem = await prisma.feedItem.create({
      data: {
        sourceId,
        guid: `DIRECT-TEST-${Date.now()}`,
        title: 'Test Article for Auto-Generation',
        content: 'Questo è un articolo di test creato direttamente nel database per verificare che l\'auto-generazione funzioni. Il contenuto dovrebbe essere sufficiente per generare un articolo completo con Perplexity AI.',
        url: `https://test.direct/${Date.now()}`,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        processed: false,
      }
    });

    console.log('✅ [PRAGMATIC] Test FeedItem created:', testFeedItem.id);

    // Verifica che sia salvato
    const savedCount = await prisma.feedItem.count({
      where: { sourceId }
    });

    console.log(`📊 [PRAGMATIC] FeedItems in database: ${savedCount}`);

    return NextResponse.json({
      success: true,
      testFeedItem: {
        id: testFeedItem.id,
        title: testFeedItem.title,
        content: testFeedItem.content?.substring(0, 100) + '...',
        processed: testFeedItem.processed
      },
      totalFeedItems: savedCount,
      message: 'Test FeedItem created directly in database'
    });

  } catch (error) {
    console.error('❌ [PRAGMATIC] Failed to create test FeedItem:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}