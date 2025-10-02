import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createImageContainer } from '@/composition-root/modules/image';

/**
 * CRON Job: Upload DALL-E images to WordPress
 *
 * This job runs periodically to upload generated DALL-E images to WordPress
 * before their 24h Azure Blob URLs expire, ensuring permanent access.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🔄 [Upload CRON] Starting image upload to WordPress process...');

    // Get WordPress settings
    const wpResponse = await fetch(`${process.env.VERCEL_URL || 'https://autogeorge.vercel.app'}/api/admin/wordpress-settings`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user'
      }
    });

    if (!wpResponse.ok) {
      throw new Error('Failed to get WordPress settings');
    }

    const wpData = await wpResponse.json();
    if (!wpData.success || !wpData.data.site) {
      throw new Error('No WordPress site configured');
    }

    const wordPressConfig = {
      siteUrl: wpData.data.site.url,
      username: wpData.data.site.username,
      password: wpData.data.site.password
    };

    console.log('✅ [Upload CRON] WordPress configuration loaded:', { siteUrl: wordPressConfig.siteUrl });

    // Find images that need upload (status = 'found' and URL contains DALL-E domain)
    const imagesToUpload = await prisma.$queryRaw`
      SELECT * FROM featured_images
      WHERE status = 'found'
      AND url LIKE '%oaidalleapiprodscus.blob.core.windows.net%'
      AND "createdAt" > NOW() - INTERVAL '20 hours'
      ORDER BY "createdAt" DESC
      LIMIT 10
    ` as any[];

    console.log(`📊 [Upload CRON] Found ${imagesToUpload.length} images to upload`);

    if (imagesToUpload.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images to upload',
        processed: 0,
        duration: `${Date.now() - startTime}ms`
      });
    }

    // Upload each image
    const container = createImageContainer();
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const image of imagesToUpload) {
      try {
        console.log(`📤 [Upload CRON] Uploading image ${image.id} for article ${image.articleId}`);

        const uploadResult = await container.imageAdminFacade.execute('UploadImageToWordPress', {
          imageId: image.id,
          wordPressConfig
        });

        if (uploadResult.isSuccess()) {
          console.log(`✅ [Upload CRON] Successfully uploaded ${image.id} → ${uploadResult.value.wordPressUrl}`);
          successful++;
          results.push({
            imageId: image.id,
            articleId: image.articleId,
            status: 'success',
            wordPressUrl: uploadResult.value.wordPressUrl
          });
        } else {
          console.error(`❌ [Upload CRON] Failed to upload ${image.id}:`, uploadResult.error.message);
          failed++;
          results.push({
            imageId: image.id,
            articleId: image.articleId,
            status: 'error',
            error: uploadResult.error.message
          });
        }

      } catch (error) {
        console.error(`💥 [Upload CRON] Exception uploading ${image.id}:`, error);
        failed++;
        results.push({
          imageId: image.id,
          articleId: image.articleId,
          status: 'exception',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`🏁 [Upload CRON] Upload process completed: ${successful} successful, ${failed} failed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed: imagesToUpload.length,
      successful,
      failed,
      duration: `${duration}ms`,
      results
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [Upload CRON] Upload process failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 });
  }
}