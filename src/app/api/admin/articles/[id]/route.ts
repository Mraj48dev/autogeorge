import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles/[id]
 * Gets a specific article with complete details and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get the article with source and feed item information
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
            url: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Try to find the associated feed item to get generation metadata
    const feedItem = await prisma.feedItem.findFirst({
      where: {
        articleId: article.id
      },
      include: {
        source: true
      }
    });

    // Calculate statistics
    const contentLength = article.content?.length || 0;
    const wordCount = Math.floor(contentLength / 5);
    const sentenceCount = (article.content?.match(/[.!?]+/g) || []).length;
    const paragraphCount = (article.content?.split(/\n\s*\n/) || []).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Extract potential SEO data from content (if it exists)
    const extractSeoFromContent = (content: string) => {
      const lines = content.split('\n');
      const seoData = {
        metaDescription: '',
        keywords: [] as string[],
        tags: [] as string[]
      };

      // Look for structured metadata in content
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('meta description') || trimmed.includes('Meta Description')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) seoData.metaDescription = match[1].trim();
        }
        if (trimmed.includes('keywords') || trimmed.includes('Keywords')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) {
            seoData.keywords = match[1].split(',').map(k => k.trim()).filter(k => k);
          }
        }
        if (trimmed.includes('tags') || trimmed.includes('Tags')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) {
            seoData.tags = match[1].split(',').map(t => t.trim()).filter(t => t);
          }
        }
      });

      return seoData;
    };

    const seoData = extractSeoFromContent(article.content || '');

    // Build the response with enhanced data
    const response = {
      success: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          slug: article.slug,
          status: article.status,
          sourceId: article.sourceId,
          metaDescription: article.yoastSeo ? (article.yoastSeo as any)?.meta_description : null,
          createdAt: article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString()
        },
        source: article.source ? {
          id: article.source.id,
          name: article.source.name,
          type: article.source.type,
          url: article.source.url
        } : null,
        feedItem: feedItem ? {
          id: feedItem.id,
          title: feedItem.title,
          url: feedItem.url,
          publishedAt: feedItem.publishedAt.toISOString(),
          processed: feedItem.processed
        } : null,
        statistics: {
          characterCount: contentLength,
          wordCount,
          sentenceCount,
          paragraphCount,
          readingTime
        },
        seo: {
          metaDescription: seoData.metaDescription || `Articolo: ${article.title.substring(0, 150)}...`,
          keywords: seoData.keywords,
          tags: seoData.tags,
          estimatedSeoScore: seoData.metaDescription && seoData.keywords.length > 0 ? 85 : 60
        },
        metadata: {
          generationType: feedItem ? '3-step-workflow' : 'simple-generation',
          originalUrl: feedItem?.url || null,
          isFromFeed: !!feedItem,
          generationDate: article.createdAt.toISOString(),
          lastModified: article.updatedAt.toISOString()
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get article API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}