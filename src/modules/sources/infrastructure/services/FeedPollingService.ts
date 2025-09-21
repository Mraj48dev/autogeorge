import { PrismaClient } from '@prisma/client';
import { Result } from '../../shared/domain/types/Result';
import { RssFetchService } from './RssFetchService';
import { Source } from '../../domain/entities/Source';

interface FeedItem {
  id: string;
  guid?: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: Date;
}

interface PollingResult {
  sourceId: string;
  sourceName: string;
  totalFetched: number;
  newItems: number;
  duplicatesSkipped: number;
  success: boolean;
  error?: string;
  duration: number;
}

/**
 * Servizio per il polling automatico dei feed RSS con gestione duplicati
 */
export class FeedPollingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rssFetchService: RssFetchService
  ) {}

  /**
   * Esegue il polling di un singolo feed RSS
   */
  async pollSingleFeed(source: Source): Promise<Result<PollingResult, string>> {
    const startTime = Date.now();
    const sourceId = source.id.getValue();
    const sourceName = source.name.getValue();

    try {
      console.log(`🔍 Polling feed: ${sourceName} (${source.url?.getValue()})`);

      // Verifica se è troppo presto per il prossimo fetch (respect fetchInterval)
      const configuration = source.configuration as any;
      const fetchInterval = configuration?.fetchInterval || 60; // Default 1 minuto

      if (source.lastFetchAt) {
        const timeSinceLastFetch = Date.now() - source.lastFetchAt.getTime();
        const intervalMs = fetchInterval * 1000;

        if (timeSinceLastFetch < intervalMs) {
          console.log(`⏳ Skipping ${sourceName}: fetched ${timeSinceLastFetch}ms ago, interval is ${intervalMs}ms`);
          return Result.success({
            sourceId,
            sourceName,
            totalFetched: 0,
            newItems: 0,
            duplicatesSkipped: 0,
            success: true,
            duration: Date.now() - startTime
          });
        }
      }

      // Fetch dal feed RSS
      const fetchResult = await this.rssFetchService.fetchRss(source);

      if (fetchResult.isFailure()) {
        console.error(`❌ Failed to fetch ${sourceName}: ${fetchResult.error.message}`);

        // Aggiorna source con l'errore
        await this.updateSourceError(sourceId, fetchResult.error.message);

        return Result.failure(`Failed to fetch RSS: ${fetchResult.error.message}`);
      }

      const fetchedItems = fetchResult.value.fetchedItems;
      console.log(`📥 Fetched ${fetchedItems.length} items from ${sourceName}`);

      // Salva i nuovi item e conta duplicati
      const { newItems, duplicatesSkipped } = await this.saveFeedItems(
        sourceId,
        fetchedItems
      );

      // Aggiorna il source con successo
      await this.updateSourceSuccess(sourceId);

      const duration = Date.now() - startTime;

      console.log(`✅ Polling completed for ${sourceName}: ${newItems} new, ${duplicatesSkipped} duplicates, ${duration}ms`);

      return Result.success({
        sourceId,
        sourceName,
        totalFetched: fetchedItems.length,
        newItems,
        duplicatesSkipped,
        success: true,
        duration
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`💥 Error polling ${sourceName}:`, error);

      await this.updateSourceError(sourceId, errorMessage);

      return Result.failure(errorMessage);
    }
  }

  /**
   * Salva gli item del feed nel database, evitando duplicati
   */
  private async saveFeedItems(
    sourceId: string,
    fetchedItems: any[]
  ): Promise<{ newItems: number; duplicatesSkipped: number }> {
    let newItems = 0;
    let duplicatesSkipped = 0;

    for (const item of fetchedItems) {
      try {
        // Usa il GUID se disponibile, altrimenti l'URL, altrimenti un hash del contenuto
        const guid = item.id || item.guid || item.url || this.generateItemHash(item);

        await this.prisma.feedItem.create({
          data: {
            sourceId,
            guid,
            title: item.title || 'Untitled',
            content: item.content || '',
            url: item.url,
            publishedAt: item.publishedAt || new Date(),
            fetchedAt: new Date(),
            processed: false
          }
        });

        newItems++;
        console.log(`💾 Saved new item: ${item.title?.substring(0, 50)}...`);

      } catch (error: any) {
        // Se errore di unique constraint, è un duplicato
        if (error.code === 'P2002') {
          duplicatesSkipped++;
          console.log(`🔄 Skipped duplicate: ${item.title?.substring(0, 50)}...`);
        } else {
          console.error('Error saving feed item:', error);
          throw error;
        }
      }
    }

    return { newItems, duplicatesSkipped };
  }

  /**
   * Genera un hash univoco per un item senza GUID
   */
  private generateItemHash(item: any): string {
    const content = `${item.title || ''}|${item.content || ''}|${item.publishedAt || ''}`;
    // Simple hash function (in produzione usare crypto)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Aggiorna il source con successo
   */
  private async updateSourceSuccess(sourceId: string): Promise<void> {
    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastFetchAt: new Date(),
        lastErrorAt: null,
        lastError: null,
        status: 'active'
      }
    });
  }

  /**
   * Aggiorna il source con errore
   */
  private async updateSourceError(sourceId: string, error: string): Promise<void> {
    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastFetchAt: new Date(),
        lastErrorAt: new Date(),
        lastError: error,
        status: 'error'
      }
    });
  }

  /**
   * Ottieni tutti i feed item non processati per un source
   */
  async getUnprocessedItems(sourceId: string, limit = 10): Promise<FeedItem[]> {
    const items = await this.prisma.feedItem.findMany({
      where: {
        sourceId,
        processed: false
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: limit
    });

    return items.map(item => ({
      id: item.id,
      guid: item.guid || undefined,
      title: item.title,
      content: item.content,
      url: item.url || undefined,
      publishedAt: item.publishedAt
    }));
  }

  /**
   * Marca un feed item come processato
   */
  async markItemAsProcessed(itemId: string, articleId?: string): Promise<void> {
    await this.prisma.feedItem.update({
      where: { id: itemId },
      data: {
        processed: true,
        articleId
      }
    });
  }

  /**
   * Ottieni statistiche per un source
   */
  async getSourceStats(sourceId: string): Promise<{
    totalItems: number;
    unprocessedItems: number;
    lastFetch?: Date;
    lastError?: string;
  }> {
    const [totalItems, unprocessedItems, source] = await Promise.all([
      this.prisma.feedItem.count({ where: { sourceId } }),
      this.prisma.feedItem.count({ where: { sourceId, processed: false } }),
      this.prisma.source.findUnique({ where: { id: sourceId } })
    ]);

    return {
      totalItems,
      unprocessedItems,
      lastFetch: source?.lastFetchAt || undefined,
      lastError: source?.lastError || undefined
    };
  }
}