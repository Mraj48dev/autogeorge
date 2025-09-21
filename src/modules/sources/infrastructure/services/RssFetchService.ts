import { Result } from '../../shared/domain/types/Result';
import {
  FetchResult,
  FetchError,
  FetchedItem,
  SourceTestResult,
} from '../../domain/ports/SourceFetchService';
import { Source } from '../../domain/entities/Source';

/**
 * Real RSS Fetch Service implementation
 * Uses standard HTTP fetch to retrieve and parse RSS feeds
 */
export class RssFetchService {
  private readonly userAgent = 'AutoGeorge RSS Fetcher 1.0';
  private readonly timeout = 10000; // 10 seconds

  async fetchRss(source: Source): Promise<Result<FetchResult, FetchError>> {
    try {
      if (!source.url) {
        return Result.failure(new FetchError('RSS source requires URL', 'validation'));
      }

      const startTime = Date.now();
      const url = source.url.getValue();
      const maxItems = source.configuration?.maxItems || 10;

      console.log(`🔄 Fetching RSS from: ${url} (max ${maxItems} items)`);

      // Fetch RSS feed
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return Result.failure(new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          'network'
        ));
      }

      const xmlText = await response.text();

      // Parse RSS/XML
      const items = await this.parseRssXml(xmlText, maxItems);

      const duration = Date.now() - startTime;

      console.log(`✅ RSS fetch completed: ${items.length} items in ${duration}ms`);

      return Result.success({
        sourceId: source.id.getValue(),
        fetchedItems: items,
        newItems: items, // For RSS, all fetched items are considered "new" in this implementation
        duration,
        metadata: {
          fetchedAt: new Date(),
          totalFound: items.length,
          newItemsCount: items.length,
          duplicatesSkipped: 0,
          errors: [],
          sourceMetadata: {
            sourceUrl: url,
            userAgent: this.userAgent,
          },
        },
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        return Result.failure(new FetchError('Request timeout', 'network'));
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('RSS fetch error:', errorMessage);

      return Result.failure(new FetchError(errorMessage, 'unknown'));
    }
  }

  async testRss(source: Source): Promise<Result<SourceTestResult, FetchError>> {
    try {
      if (!source.url) {
        return Result.failure(new FetchError('RSS source requires URL', 'validation'));
      }

      const startTime = Date.now();
      const url = source.url.getValue();

      // Test with HEAD request first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const warnings: string[] = [];

      if (!response.ok) {
        return Result.failure(new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          'network'
        ));
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('xml') && !contentType.includes('rss')) {
        warnings.push('Content-Type does not indicate XML/RSS format');
      }

      // Try to fetch a small sample
      const fetchResult = await this.fetchRss(source);
      const sampleItems = fetchResult.isSuccess() ? fetchResult.value.items.slice(0, 3) : [];

      return Result.success({
        isReachable: true,
        isValid: fetchResult.isSuccess(),
        responseTime,
        sampleItems,
        warnings,
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        return Result.failure(new FetchError('Connection timeout', 'network'));
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.failure(new FetchError(errorMessage, 'network'));
    }
  }

  private async parseRssXml(xmlText: string, maxItems: number): Promise<FetchedItem[]> {
    const items: FetchedItem[] = [];

    try {
      // Simple XML parsing using browser DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid XML format');
      }

      // Try RSS 2.0 format first
      let itemElements = doc.querySelectorAll('item');

      // If no items found, try Atom format
      if (itemElements.length === 0) {
        itemElements = doc.querySelectorAll('entry');
      }

      // Convert NodeList to Array and limit to maxItems
      const limitedItems = Array.from(itemElements).slice(0, maxItems);

      for (const itemElement of limitedItems) {
        const item = this.parseRssItem(itemElement);
        if (item) {
          items.push(item);
        }
      }

    } catch (error) {
      console.error('RSS parsing error:', error);
      throw new Error(`Failed to parse RSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return items;
  }

  private parseRssItem(itemElement: Element): FetchedItem | null {
    try {
      // RSS 2.0 fields
      const title = this.getElementText(itemElement, 'title');
      const description = this.getElementText(itemElement, 'description');
      const link = this.getElementText(itemElement, 'link');
      const pubDate = this.getElementText(itemElement, 'pubDate');
      const guid = this.getElementText(itemElement, 'guid');

      // Atom fields (fallback)
      const atomTitle = this.getElementText(itemElement, 'title');
      const atomSummary = this.getElementText(itemElement, 'summary');
      const atomContent = this.getElementText(itemElement, 'content');
      const atomLink = itemElement.querySelector('link')?.getAttribute('href');
      const atomUpdated = this.getElementText(itemElement, 'updated');
      const atomId = this.getElementText(itemElement, 'id');

      const finalTitle = title || atomTitle;
      const finalContent = description || atomSummary || atomContent;
      const finalLink = link || atomLink;
      const finalDate = pubDate || atomUpdated;
      const finalId = guid || atomId || finalLink;

      if (!finalTitle && !finalContent) {
        return null; // Skip items without title or content
      }

      return {
        id: finalId || `item_${Date.now()}_${Math.random()}`,
        title: finalTitle || 'Untitled',
        content: finalContent || '',
        url: finalLink,
        publishedAt: finalDate ? new Date(finalDate) : new Date(),
        metadata: {
          guid,
          atomId,
          originalPubDate: finalDate,
        },
      };

    } catch (error) {
      console.warn('Error parsing RSS item:', error);
      return null;
    }
  }

  private getElementText(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }
}