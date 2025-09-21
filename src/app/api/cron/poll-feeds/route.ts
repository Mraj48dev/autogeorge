import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';
import { FeedPollingService } from '@/modules/sources/infrastructure/services/FeedPollingService';
import { RssFetchService } from '@/modules/sources/infrastructure/services/RssFetchService';
import { PrismaClient } from '@prisma/client';

/**
 * GET /api/cron/poll-feeds
 * Cron endpoint che monitora automaticamente tutti i feed RSS attivi
 * Chiamato ogni minuto da Vercel Cron Jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica che la richiesta provenga da Vercel Cron
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In produzione, verifica il secret per sicurezza
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron request attempted');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [${timestamp}] Starting automated feed polling...`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

    const startTime = Date.now();

    // Inizializza i servizi
    const prisma = new PrismaClient();
    const rssFetchService = new RssFetchService();
    const pollingService = new FeedPollingService(prisma, rssFetchService);

    try {
      // Ottieni tutti i feed RSS attivi dal database
      const activeSources = await prisma.source.findMany({
        where: {
          status: 'active',
          type: 'rss',
          url: {
            not: null
          }
        },
        orderBy: {
          lastFetchAt: 'asc' // Prima i feed che non sono stati aggiornati da più tempo
        },
        take: 100 // Max 100 feed per volta
      });

      console.log(`📊 Found ${activeSources.length} active RSS sources to poll`);

      // Log dettagliato dei sources trovati
      activeSources.forEach((source, index) => {
        console.log(`  ${index + 1}. 📰 "${source.name}" (${source.url})`);
        console.log(`     ⏰ Last fetch: ${source.lastFetchAt ? new Date(source.lastFetchAt).toLocaleString() : 'Never'}`);
        console.log(`     🔴 Last error: ${source.lastError || 'None'}`);
      });

      const results = {
        totalSources: activeSources.length,
        successfulPolls: 0,
        failedPolls: 0,
        newItemsFound: 0,
        duplicatesSkipped: 0,
        errors: [] as string[],
        duration: 0
      };

      // Polling di ogni feed in batch per evitare overload
      const batchSize = 3; // Ridotto a 3 per essere più conservativi
      for (let i = 0; i < activeSources.length; i += batchSize) {
        const batch = activeSources.slice(i, i + batchSize);

        const batchPromises = batch.map(async (sourceData) => {
          try {
            // Converti i dati Prisma in entità domain
            const source = createSourceEntity(sourceData);

            const pollResult = await pollingService.pollSingleFeed(source);

            if (pollResult.isSuccess()) {
              const result = pollResult.value;
              results.successfulPolls++;
              results.newItemsFound += result.newItems;
              results.duplicatesSkipped += result.duplicatesSkipped;

              if (result.newItems > 0) {
                console.log(`✅ 🎉 NEW ARTICLES FOUND! ${result.newItems} new items from ${result.sourceName}`);
                console.log(`   📈 Total fetched: ${result.totalFetched}, Duplicates: ${result.duplicatesSkipped}`);

                // Se è il tuo sito, log extra speciale
                if (sourceData.url?.includes('limegreen-termite-635510.hostingersite.com')) {
                  console.log(`   🌟 SPECIAL: New articles detected on YOUR TEST SITE!`);
                }
              } else {
                console.log(`   ℹ️  No new items from ${result.sourceName} (${result.duplicatesSkipped} duplicates)`);
              }
            } else {
              results.failedPolls++;
              results.errors.push(`${sourceData.name}: ${pollResult.error}`);
              console.warn(`❌ Failed to poll ${sourceData.name}: ${pollResult.error}`);
            }
          } catch (error) {
            results.failedPolls++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`${sourceData.name}: ${errorMsg}`);
            console.error(`💥 Error polling ${sourceData.name}:`, error);
          }
        });

        // Aspetta che il batch corrente completi prima di procedere
        await Promise.all(batchPromises);

        // Pausa tra i batch per non sovraccaricare
        if (i + batchSize < activeSources.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondi di pausa
        }
      }

      results.duration = Date.now() - startTime;

      console.log(`🏁 Automated polling completed:`, {
      sources: results.totalSources,
      successful: results.successfulPolls,
      failed: results.failedPolls,
      newItems: results.newItemsFound,
      duplicates: results.duplicatesSkipped,
      duration: `${results.duration}ms`
    });

    // Log degli errori se presenti
    if (results.errors.length > 0) {
      console.warn('Polling errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

    } catch (error) {
      console.error('Critical error during feed polling:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Database or service error during polling',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Critical error in automated feed polling:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during feed polling',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Helper per convertire dati Prisma in entità domain Source
 */
function createSourceEntity(sourceData: any) {
  // Import necessari per le entità domain
  const { Source } = require('@/modules/sources/domain/entities/Source');
  const { SourceId } = require('@/modules/sources/domain/value-objects/SourceId');
  const { SourceName } = require('@/modules/sources/domain/value-objects/SourceName');
  const { SourceType } = require('@/modules/sources/domain/value-objects/SourceType');
  const { SourceStatus } = require('@/modules/sources/domain/value-objects/SourceStatus');
  const { SourceUrl } = require('@/modules/sources/domain/value-objects/SourceUrl');

  // Costruisci l'entità Source usando lo stesso pattern del repository
  const id = SourceId.fromString(sourceData.id);
  const name = SourceName.fromString(sourceData.name);
  const type = SourceType.fromString(sourceData.type);
  const status = SourceStatus.fromString(sourceData.status);
  const url = sourceData.url ? SourceUrl.fromString(sourceData.url) : undefined;

  return new Source(
    id,
    name,
    type,
    status,
    url,
    sourceData.configuration,
    sourceData.metadata,
    sourceData.lastFetchAt,
    sourceData.lastErrorAt,
    sourceData.lastError,
    sourceData.createdAt,
    sourceData.updatedAt
  );
}

/**
 * POST /api/cron/poll-feeds
 * Endpoint alternativo per trigger manuale del polling
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { immediate = false } = body;

    console.log('🚀 Manual feed polling triggered', { immediate });

    // Riutilizza la stessa logica del GET
    return GET(request);

  } catch (error) {
    console.error('Error in manual feed polling trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual polling' },
      { status: 500 }
    );
  }
}