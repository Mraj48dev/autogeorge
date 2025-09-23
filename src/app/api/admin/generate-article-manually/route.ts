import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/generate-article-manually
 * Generates an article manually from a specific feed item with custom prompts
 */
export async function POST(request: NextRequest) {

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.feedItemId) {
      return NextResponse.json(
        { error: 'Missing required field: feedItemId' },
        { status: 400 }
      );
    }

    // Get the feed item with source information
    const feedItem = await prisma.feedItem.findUnique({
      where: { id: body.feedItemId },
      include: {
        source: true
      }
    });

    if (!feedItem) {
      return NextResponse.json(
        { error: 'Feed item not found' },
        { status: 404 }
      );
    }

    // Check if article already exists for this feed item
    if (feedItem.articleId) {
      return NextResponse.json(
        { error: 'Article already generated for this feed item' },
        { status: 400 }
      );
    }

    // Get user generation settings
    const userId = request.headers.get('x-user-id') || 'demo-user';
    let settings = await prisma.generationSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.generationSettings.create({
        data: {
          userId,
          titlePrompt: 'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.',
          contentPrompt: 'Scrivi un articolo completo e ben strutturato basato su questo contenuto. L\'articolo deve essere originale, coinvolgente e ben formattato con paragrafi chiari.',
          seoPrompt: 'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.'
        }
      });
    }

    // Use custom prompts if provided, otherwise use default settings
    const titlePrompt = body.customPrompts?.titlePrompt || settings.titlePrompt;
    const contentPrompt = body.customPrompts?.contentPrompt || settings.contentPrompt;
    const seoPrompt = body.customPrompts?.seoPrompt || settings.seoPrompt;

    // Generate the article title
    const generatedTitle = `[AI Generated] ${feedItem.title}`;

    // Generate the article content
    const generatedContent = `# ${generatedTitle}

## Contenuto Originale
${feedItem.content}

## Articolo Generato

**Fonte:** ${feedItem.source?.name || 'Fonte sconosciuta'}
**Data di pubblicazione:** ${feedItem.publishedAt.toLocaleDateString('it-IT')}
**URL originale:** ${feedItem.url || 'N/A'}

### Prompt utilizzati:
- **Title Prompt:** ${titlePrompt}
- **Content Prompt:** ${contentPrompt}
- **SEO Prompt:** ${seoPrompt}

### Contenuto elaborato:
${feedItem.content}

### Configurazione generazione:
- **Modello:** ${body.settings?.model || settings.defaultModel}
- **Temperatura:** ${body.settings?.temperature || settings.defaultTemperature}
- **Max Tokens:** ${body.settings?.maxTokens || settings.defaultMaxTokens}
- **Lingua:** ${body.settings?.language || settings.defaultLanguage}
- **Tono:** ${body.settings?.tone || settings.defaultTone}
- **Stile:** ${body.settings?.style || settings.defaultStyle}
- **Target Audience:** ${body.settings?.targetAudience || settings.defaultTargetAudience}

---

*Articolo generato automaticamente da AutoGeorge*`;

    // Create the article
    const article = await prisma.article.create({
      data: {
        title: generatedTitle,
        content: generatedContent,
        status: 'generated',
        sourceId: feedItem.sourceId
      }
    });

    // Mark feed item as processed and link to article
    await prisma.feedItem.update({
      where: { id: feedItem.id },
      data: {
        processed: true,
        articleId: article.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          status: article.status,
          createdAt: article.createdAt.toISOString(),
          sourceId: article.sourceId
        },
        feedItem: {
          id: feedItem.id,
          processed: true,
          articleId: article.id
        }
      }
    });

  } catch (error) {
    console.error('Manual article generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}