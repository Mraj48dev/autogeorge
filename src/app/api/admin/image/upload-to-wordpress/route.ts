import { NextRequest, NextResponse } from 'next/server';
import { createImageContainer } from '@/modules/image/infrastructure/container/ImageContainer';

/**
 * POST /api/admin/image/upload-to-wordpress
 * Uploads a generated DALL-E image to WordPress media library
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageId, wordPressConfig } = body;

    if (!imageId || !wordPressConfig) {
      return NextResponse.json(
        { error: 'imageId and wordPressConfig are required' },
        { status: 400 }
      );
    }

    console.log('📤 [WordPress Upload API] Starting upload:', {
      imageId,
      siteUrl: wordPressConfig.siteUrl
    });

    // Use Image Module container
    const container = createImageContainer();
    const result = await container.imageAdminFacade.execute('UploadImageToWordPress', {
      imageId,
      wordPressConfig
    });

    if (result.isFailure()) {
      console.error('❌ [WordPress Upload API] Upload failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error.message
        },
        { status: 500 }
      );
    }

    console.log('✅ [WordPress Upload API] Upload successful:', result.value);

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('❌ [WordPress Upload API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}