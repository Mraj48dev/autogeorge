import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createSourcesContainer } from '@/modules/sources/infrastructure/container/SourcesContainer';

/**
 * POST /api/admin/monitor-generation/[id]/generate
 * Triggera la generazione dell'articolo per un record monitor specifico
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const monitorId = params.id;
    console.log(`🚀 Starting article generation for monitor ID: ${monitorId}`);

    // 1. Trova il record monitor
    const monitor = await prisma.monitorGeneration.findUnique({
      where: { id: monitorId },
      include: {
        feedItem: true,
        source: true
      }
    });

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor generation record not found' },
        { status: 404 }
      );
    }

    if (monitor.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot generate from monitor with status: ${monitor.status}` },
        { status: 400 }
      );
    }

    // 2. Aggiorna status a "processing"
    await prisma.monitorGeneration.update({
      where: { id: monitorId },
      data: {
        status: 'processing',
        updatedAt: new Date()
      }
    });

    try {
      // 3. Usa il container Sources per generare l'articolo
      const container = createSourcesContainer();
      const autoGenerator = container.articleAutoGenerator;

      console.log(`🤖 Using ArticleAutoGenerator for feedItem: ${monitor.feedItem.id}`);

      // 4. Converte monitor in formato FeedItemForGeneration
      const feedItemForGeneration = {
        id: monitor.feedItem.id,
        guid: monitor.feedItem.guid,
        title: monitor.title,
        content: monitor.content,
        url: monitor.url,
        publishedAt: new Date(monitor.publishedAt)
      };

      console.log(`🔄 Generating article for feed item: ${feedItemForGeneration.title}`);

      // 5. Genera l'articolo dal feedItem
      const generationResult = await autoGenerator.generateFromFeedItems({
        sourceId: monitor.sourceId,
        feedItems: [feedItemForGeneration]
      });

      if (generationResult.isFailure()) {
        // Aggiorna con errore
        await prisma.monitorGeneration.update({
          where: { id: monitorId },
          data: {
            status: 'error',
            error: generationResult.error.message,
            retryCount: monitor.retryCount + 1,
            updatedAt: new Date()
          }
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Article generation failed',
            details: generationResult.error.message
          },
          { status: 500 }
        );
      }

      const result = generationResult.value;

      // 6. Trova l'articolo generato (se presente)
      let articleId = null;
      if (result.summary.successful > 0 && result.generatedArticles.length > 0) {
        const generatedResult = result.generatedArticles[0];
        if (generatedResult.success && generatedResult.articleId) {
          articleId = generatedResult.articleId;
        }
      }

      // 6. Aggiorna monitor con successo
      await prisma.monitorGeneration.update({
        where: { id: monitorId },
        data: {
          status: 'completed',
          articleId,
          generatedAt: new Date(),
          error: null,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Article generation completed for monitor ${monitorId}. ArticleId: ${articleId}`);

      return NextResponse.json({
        success: true,
        data: {
          monitorId,
          articleId,
          generatedAt: new Date().toISOString(),
          summary: result.summary
        }
      });

    } catch (generationError) {
      // Aggiorna con errore di generazione
      await prisma.monitorGeneration.update({
        where: { id: monitorId },
        data: {
          status: 'error',
          error: generationError instanceof Error ? generationError.message : 'Unknown generation error',
          retryCount: monitor.retryCount + 1,
          updatedAt: new Date()
        }
      });

      throw generationError;
    }

  } catch (error) {
    console.error(`❌ Error generating article for monitor ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Article generation process failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/monitor-generation/[id]/generate
 * Ottiene lo status della generazione per un monitor specifico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const monitorId = params.id;

    const monitor = await prisma.monitorGeneration.findUnique({
      where: { id: monitorId },
      include: {
        feedItem: {
          select: {
            id: true,
            title: true,
            processed: true
          }
        },
        source: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor generation record not found' },
        { status: 404 }
      );
    }

    // Se è stato generato un articolo, recupera i dettagli
    let article = null;
    if (monitor.articleId) {
      article = await prisma.article.findUnique({
        where: { id: monitor.articleId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        monitor,
        article
      }
    });

  } catch (error) {
    console.error(`❌ Error fetching monitor generation status ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch monitor generation status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}