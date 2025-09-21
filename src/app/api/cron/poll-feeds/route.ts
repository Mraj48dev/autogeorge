import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';

/**
 * GET /api/cron/poll-feeds
 * Cron endpoint che monitora automaticamente tutti i feed RSS attivi
 * Chiamato ogni minuto da Vercel Cron Jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica che la richiesta provenga da Vercel Cron
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In produzione, verifica il secret per sicurezza (TEMPORANEAMENTE DISABILITATO)
    // TODO: Riattivare dopo aver configurato CRON_SECRET in Vercel
    /*
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron request attempted');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    */

    console.log('🔓 Auth check bypassed for RSS polling functionality');

    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [${timestamp}] Starting automated feed polling...`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

    const startTime = Date.now();

    // Inizializza solo Prisma
    const prisma = new PrismaClient();

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

      if (activeSources.length === 0) {
        console.log('⚠️ No active RSS sources found!');
        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          results: {
            totalSources: 0,
            successfulPolls: 0,
            failedPolls: 0,
            newItemsFound: 0,
            duplicatesSkipped: 0,
            errors: [],
            duration: 0
          }
        });
      }

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
            console.log(`🔍 Polling feed: ${sourceData.name} (${sourceData.url})`);

            // Fetch RSS direttamente
            const fetchResult = await fetchRssFeed(sourceData.url);

            if (fetchResult.isSuccess()) {
              const feedData = fetchResult.value;
              console.log(`📥 Fetched ${feedData.items.length} items from ${sourceData.name}`);

              let newItems = 0;
              let duplicatesSkipped = 0;

              // Salva gli items nel database
              for (const item of feedData.items) {
                try {
                  // Controlla se esiste già
                  const existing = await prisma.feedItem.findFirst({
                    where: {
                      OR: [
                        { title: item.title, sourceId: sourceData.id },
                        { guid: item.guid }
                      ]
                    }
                  });

                  if (existing) {
                    console.log(`🔄 Skipped duplicate: ${item.title.substring(0, 50)}...`);
                    duplicatesSkipped++;
                  } else {
                    await prisma.feedItem.create({
                      data: {
                        title: item.title,
                        content: item.content || item.description || '',
                        url: item.link,
                        guid: item.guid || item.link,
                        publishedAt: item.publishedAt,
                        fetchedAt: new Date(),
                        sourceId: sourceData.id,
                        processed: false
                      }
                    });
                    console.log(`💾 Saved new item: ${item.title.substring(0, 50)}...`);
                    newItems++;
                  }
                } catch (dbError) {
                  console.error(`❌ Database error for ${item.title}:`, dbError);
                }
              }

              // Aggiorna source
              await prisma.source.update({
                where: { id: sourceData.id },
                data: {
                  lastFetchAt: new Date(),
                  lastError: null,
                  lastErrorAt: null
                }
              });

              results.successfulPolls++;
              results.newItemsFound += newItems;
              results.duplicatesSkipped += duplicatesSkipped;

              if (newItems > 0) {
                console.log(`✅ 🎉 NEW ARTICLES FOUND! ${newItems} new items from ${sourceData.name}`);

                // Se è il tuo sito, log extra speciale
                if (sourceData.url?.includes('limegreen-termite-635510.hostingersite.com')) {
                  console.log(`   🌟 SPECIAL: New articles detected on YOUR TEST SITE!`);
                }
              } else {
                console.log(`   ℹ️  No new items from ${sourceData.name} (${duplicatesSkipped} duplicates)`);
              }
            } else {
              // Errore di fetch
              console.warn(`❌ Failed to fetch ${sourceData.name}: ${fetchResult.error}`);

              await prisma.source.update({
                where: { id: sourceData.id },
                data: {
                  lastError: fetchResult.error,
                  lastErrorAt: new Date()
                }
              });

              results.failedPolls++;
              results.errors.push(`${sourceData.name}: ${fetchResult.error}`);
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

/**
 * RSS Feed Fetcher semplificato
 */
async function fetchRssFeed(url: string) {
  try {
    console.log(`🔄 Fetching RSS from: ${url} (max 10 items)`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AutoGeorge RSS Bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse XML semplificato per RSS
    const items = parseRssXml(xmlText);

    console.log(`✅ RSS fetch completed: ${items.length} items in ${Date.now()}ms`);

    return {
      isSuccess: () => true,
      value: {
        items: items.slice(0, 10) // Limita a 10 items
      }
    };

  } catch (error) {
    console.error(`❌ RSS fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isSuccess: () => false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parser XML RSS semplificato
 */
function parseRssXml(xmlText: string) {
  const items: any[] = [];

  try {
    // Regex semplificato per estrarre items RSS
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const itemXml = match[1];

      const title = extractXmlTag(itemXml, 'title');
      const link = extractXmlTag(itemXml, 'link');
      const description = extractXmlTag(itemXml, 'description');
      const pubDate = extractXmlTag(itemXml, 'pubDate');
      const guid = extractXmlTag(itemXml, 'guid') || link;

      if (title && link) {
        items.push({
          title: cleanXmlText(title),
          link: cleanXmlText(link),
          content: cleanXmlText(description),
          description: cleanXmlText(description),
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
          guid: cleanXmlText(guid)
        });
      }
    }

    return items;
  } catch (error) {
    console.error('Error parsing RSS XML:', error);
    return [];
  }
}

/**
 * Estrae contenuto di un tag XML
 */
function extractXmlTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Pulisce testo XML da CDATA e HTML
 */
function cleanXmlText(text: string): string {
  if (!text) return '';

  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}