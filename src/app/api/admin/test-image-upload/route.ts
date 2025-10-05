import { NextRequest, NextResponse } from 'next/server';
import { WordPressMediaService } from '../../../../modules/publishing/infrastructure/services/WordPressMediaService';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/test-image-upload
 * Tests WordPress image upload with retry logic and compression
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, siteId } = body;

    if (!imageUrl || !siteId) {
      return NextResponse.json({
        success: false,
        error: 'Missing imageUrl or siteId'
      }, { status: 400 });
    }

    // Get WordPress site configuration
    const wordPressSite = await prisma.wordPressSite.findUnique({
      where: { id: siteId }
    });

    if (!wordPressSite) {
      return NextResponse.json({
        success: false,
        error: 'WordPress site not found'
      }, { status: 404 });
    }

    console.log('🧪 [Test Upload] Starting image upload test...');
    console.log(`📍 [Test Upload] Site: ${wordPressSite.name} (${wordPressSite.url})`);
    console.log(`🖼️ [Test Upload] Image URL: ${imageUrl}`);

    // Download the test image
    const startDownload = Date.now();
    const imageResponse = await fetch(imageUrl);
    const downloadTime = Date.now() - startDownload;

    if (!imageResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to download test image: ${imageResponse.status}`,
        downloadTime
      }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    const imageFile = new File([imageBlob], `test-upload-${Date.now()}.png`, { type: 'image/png' });

    console.log(`📥 [Test Upload] Downloaded in ${downloadTime}ms, size: ${Math.round(imageFile.size / 1024)}KB`);

    // Upload to WordPress
    const mediaService = new WordPressMediaService();

    const startUpload = Date.now();
    const uploadResult = await mediaService.uploadMedia(
      {
        siteUrl: wordPressSite.url,
        username: wordPressSite.username,
        password: wordPressSite.password
      },
      {
        file: imageFile,
        title: 'AutoGeorge Test Upload',
        alt_text: 'Test image uploaded by AutoGeorge',
        caption: `Test upload performed at ${new Date().toISOString()}`
      }
    );
    const uploadTime = Date.now() - startUpload;

    if (uploadResult.isFailure()) {
      console.error('❌ [Test Upload] Upload failed:', uploadResult.error);
      return NextResponse.json({
        success: false,
        error: uploadResult.error.message,
        details: uploadResult.error.details,
        timing: {
          downloadTime,
          uploadTime,
          totalTime: downloadTime + uploadTime
        }
      }, { status: 500 });
    }

    const mediaResult = uploadResult.value;
    console.log('✅ [Test Upload] Success:', mediaResult);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      result: {
        mediaId: mediaResult.id,
        url: mediaResult.url,
        title: mediaResult.title,
        alt_text: mediaResult.alt_text,
        media_type: mediaResult.media_type,
        mime_type: mediaResult.mime_type
      },
      timing: {
        downloadTime,
        uploadTime,
        totalTime: downloadTime + uploadTime
      },
      fileInfo: {
        originalSize: imageBuffer.byteLength,
        originalSizeKB: Math.round(imageBuffer.byteLength / 1024),
        processedSize: imageFile.size,
        processedSizeKB: Math.round(imageFile.size / 1024)
      }
    });

  } catch (error) {
    console.error('💥 [Test Upload] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/test-image-upload
 * Returns available WordPress sites for testing
 */
export async function GET() {
  try {
    const sites = await prisma.wordPressSite.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        isActive: true
      },
      where: {
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      sites,
      testImageUrls: [
        'https://picsum.photos/800/600.jpg', // Random image
        'https://via.placeholder.com/1200x800/0066cc/ffffff.png', // Blue placeholder
        'https://httpbin.org/image/png', // PNG test image
      ]
    });

  } catch (error) {
    console.error('Error fetching WordPress sites:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch WordPress sites'
    }, { status: 500 });
  }
}