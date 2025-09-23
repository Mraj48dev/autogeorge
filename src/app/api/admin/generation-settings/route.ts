import { NextRequest, NextResponse } from 'next/server';
import { getContentContainer } from '@/modules/content/infrastructure/container/ContentContainer';

/**
 * GET /api/admin/generation-settings
 * Retrieves user's generation settings
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session/auth (simplified for demo)
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const container = getContentContainer();
    const useCase = container.getGenerationSettings;

    const result = await useCase.execute({ userId });

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
    console.error('Generation settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/generation-settings
 * Updates user's generation settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Get user ID from session/auth (simplified for demo)
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const body = await request.json();

    const container = getContentContainer();
    const useCase = container.updateGenerationSettings;

    const result = await useCase.execute({
      userId,
      titlePrompt: body.titlePrompt,
      contentPrompt: body.contentPrompt,
      seoPrompt: body.seoPrompt,
      modelSettings: body.modelSettings ? {
        model: body.modelSettings.model,
        temperature: body.modelSettings.temperature,
        maxTokens: body.modelSettings.maxTokens
      } : undefined,
      languageSettings: body.languageSettings ? {
        language: body.languageSettings.language,
        tone: body.languageSettings.tone,
        style: body.languageSettings.style,
        targetAudience: body.languageSettings.targetAudience
      } : undefined
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
    console.error('Generation settings update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}