import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '../../../../../composition-root/factories';

/**
 * POST /api/admin/prompt/generate
 *
 * Generates an AI-optimized prompt for DALL-E image generation based on article content.
 * Used in ai_assisted and full_auto modes.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎨 [API] Prompt generation request received');

    const body = await request.json();
    const { articleId, articleTitle, articleContent, template, aiModel } = body;

    // Validate required fields
    if (!articleId || !articleTitle || !articleContent) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, articleTitle, articleContent' },
        { status: 400 }
      );
    }

    // Create container and get facade
    const container = createContainer();
    const promptEngineerFacade = container.promptEngineerFacade;

    // Generate prompt
    const result = await promptEngineerFacade.generatePrompt({
      articleId,
      articleTitle,
      articleContent,
      template,
      aiModel: aiModel || 'gpt-4',
    });

    if (result.isFailure()) {
      console.error('❌ [API] Prompt generation failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const promptData = result.getValue();

    console.log('✅ [API] Prompt generated successfully:', {
      promptId: promptData.promptId,
      characterCount: promptData.generatedPrompt.length,
    });

    return NextResponse.json({
      success: true,
      promptId: promptData.promptId,
      articleId: promptData.articleId,
      generatedPrompt: promptData.generatedPrompt,
      status: promptData.status,
      metadata: promptData.metadata,
    });

  } catch (error) {
    console.error('❌ [API] Unexpected error in prompt generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}