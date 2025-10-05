import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '../../../../../composition-root/factories';

/**
 * POST /api/admin/prompt/validate
 *
 * Validates and optionally updates an AI-generated prompt.
 * Used in ai_assisted mode when user wants to edit the generated prompt.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Prompt validation request received');

    const body = await request.json();
    const { promptId, updatedPrompt } = body;

    // Validate required fields
    if (!promptId) {
      return NextResponse.json(
        { error: 'Missing required field: promptId' },
        { status: 400 }
      );
    }

    // Create container and get facade
    const container = createContainer();
    const promptEngineerFacade = container.promptEngineerFacade;

    // Validate prompt
    const result = await promptEngineerFacade.validatePrompt({
      promptId,
      updatedPrompt,
    });

    if (result.isFailure()) {
      console.error('❌ [API] Prompt validation failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const validationData = result.getValue();

    console.log('✅ [API] Prompt validated successfully:', {
      promptId: validationData.promptId,
      isValid: validationData.isValid,
      hasWarnings: validationData.warnings?.length > 0,
    });

    return NextResponse.json({
      success: true,
      promptId: validationData.promptId,
      isValid: validationData.isValid,
      validatedPrompt: validationData.validatedPrompt,
      suggestions: validationData.suggestions,
      warnings: validationData.warnings,
    });

  } catch (error) {
    console.error('❌ [API] Unexpected error in prompt validation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}