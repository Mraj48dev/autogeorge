import { NextRequest, NextResponse } from 'next/server';
import { createImageContainer } from '@/composition-root/modules/image';

/**
 * POST /api/admin/image/generate
 * Generate a featured image for an article using AI
 */
export async function POST(request: NextRequest) {
  try {
    const input = await request.json();

    // Validate required fields
    if (!input.articleId || !input.title || !input.filename || !input.altText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: articleId, title, filename, altText'
        },
        { status: 400 }
      );
    }

    console.log('🎨 [Image Module] Starting image generation for article:', input.articleId);

    // Create Image container and execute use case
    const imageContainer = createImageContainer();
    const result = await imageContainer.imageAdminFacade.execute('GenerateImage', input);

    if (result.isFailure()) {
      console.error('❌ [Image Module] Generation failed:', result.error.message);
      return NextResponse.json(
        {
          success: false,
          error: result.error.message
        },
        { status: 500 }
      );
    }

    const generatedImage = result.value;
    console.log('✅ [Image Module] Image generated successfully:', generatedImage.imageId);

    return NextResponse.json({
      success: true,
      data: {
        imageId: generatedImage.imageId,
        url: generatedImage.url,
        filename: generatedImage.filename,
        altText: generatedImage.altText,
        status: generatedImage.status,
        revisedPrompt: generatedImage.revisedPrompt,
        message: 'Image generated successfully'
      }
    });

  } catch (error) {
    console.error('❌ [Image Module] API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during image generation'
      },
      { status: 500 }
    );
  }
}