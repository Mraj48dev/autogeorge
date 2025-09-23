import { NextRequest, NextResponse } from 'next/server';
import { getContentContainer } from '@/modules/content/infrastructure/container/ContentContainer';

/**
 * POST /api/admin/generate-article-manually
 * Generates an article manually from a specific feed item with custom prompts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.feedItem || !body.sourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: feedItem and sourceId' },
        { status: 400 }
      );
    }

    const container = getContentContainer();
    const useCase = container.generateArticleManually;

    const result = await useCase.execute({
      feedItem: {
        id: body.feedItem.id,
        title: body.feedItem.title,
        content: body.feedItem.content,
        url: body.feedItem.url,
        publishedAt: new Date(body.feedItem.publishedAt)
      },
      sourceId: body.sourceId,
      customPrompts: {
        titlePrompt: body.customPrompts?.titlePrompt,
        contentPrompt: body.customPrompts?.contentPrompt,
        seoPrompt: body.customPrompts?.seoPrompt
      },
      settings: {
        model: body.settings?.model || 'gpt-4',
        temperature: body.settings?.temperature || 0.7,
        maxTokens: body.settings?.maxTokens || 2000,
        language: body.settings?.language || 'it',
        tone: body.settings?.tone || 'professionale',
        style: body.settings?.style || 'giornalistico',
        targetAudience: body.settings?.targetAudience || 'generale'
      }
    });

    if (!result.isSuccess()) {
      return NextResponse.json(
        { error: result.getError() },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.getValue()
    });

  } catch (error) {
    console.error('Manual article generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}