import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createImageContainer } from '@/composition-root/modules/image';

/**
 * GET /api/cron/auto-image
 * Cron endpoint che genera automaticamente le immagini in evidenza
 * per gli articoli in status "generated_image_draft"
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🎨 [AutoImage CRON] Starting auto-image generation process...');
    const startTime = Date.now();

    // Check if image generation is enabled in WordPress settings
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite) {
      console.log('⚠️ [AutoImage CRON] No active WordPress site found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No active WordPress site configured',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    if (!wordpressSite.enableFeaturedImage) {
      console.log('⚠️ [AutoImage CRON] Featured image generation is disabled in WordPress settings');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Featured image generation is disabled',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    console.log(`✅ [AutoImage CRON] Featured image generation is enabled for: ${wordpressSite.name}`);

    // DEBUG: Check all articles and their statuses first
    const allRecentArticles = await prisma.article.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`🔍 [DEBUG] Recent articles and their statuses:`);
    allRecentArticles.forEach(article => {
      console.log(`  - ${article.id}: "${article.title}" → status: "${article.status}" (${article.createdAt})`);
    });

    // Find all articles with status "generated_image_draft" that need images
    const articlesNeedingImages = await prisma.article.findMany({
      where: {
        status: 'generated_image_draft'
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first
      },
      take: 5 // Limit to 5 articles per run to avoid overload
    });

    console.log(`📊 [AutoImage CRON] Found ${articlesNeedingImages.length} articles needing images`);

    if (articlesNeedingImages.length > 0) {
      console.log(`🎯 [AutoImage CRON] Articles to process:`);
      articlesNeedingImages.forEach(article => {
        console.log(`  - ${article.id}: "${article.title}" → status: "${article.status}"`);
      });
    }

    if (articlesNeedingImages.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No articles needing image generation',
        results: { processed: 0, successful: 0, failed: 0 }
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each article for image generation
    for (const article of articlesNeedingImages) {
      try {
        console.log(`🎨 [AutoImage CRON] Processing article: ${article.id} - "${article.title}"`);
        results.processed++;

        // Generate featured image using new Image Module
        const imageGenerationResult = await generateFeaturedImageWithModule(article);

        if (imageGenerationResult.success) {
          // Update article status to generated_with_image
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'generated_with_image',
              featuredMediaUrl: imageGenerationResult.imageUrl
            }
          });

          results.successful++;
          console.log(`✅ [AutoImage CRON] Image generated successfully: ${article.id} → ${imageGenerationResult.imageUrl || 'Generated'}`);

          // Check if auto-publishing is enabled to determine next step
          if (wordpressSite.enableAutoPublish) {
            // Update to ready_to_publish for auto-publishing cron to pick up
            await prisma.article.update({
              where: { id: article.id },
              data: {
                status: 'ready_to_publish'
              }
            });
            console.log(`🚀 [AutoImage CRON] Article moved to ready_to_publish: ${article.id}`);
          } else {
            console.log(`✋ [AutoImage CRON] Auto-publish disabled → Article stays in generated_with_image: ${article.id}`);
            console.log(`🎨 [AutoImage CRON] Workflow complete: Image generated, manual publish required`);
          }

        } else {
          results.failed++;
          results.errors.push(`${article.id}: ${imageGenerationResult.error || 'Unknown error'}`);
          console.error(`❌ [AutoImage CRON] Failed to generate image for article ${article.id}:`, imageGenerationResult.error);

          // Optionally move to failed status or keep trying
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'failed'
            }
          });
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${article.id}: ${errorMsg}`);
        console.error(`💥 [AutoImage CRON] Error processing article ${article.id}:`, error);

        // Move to failed status
        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: 'failed'
          }
        });
      }

      // Small delay between generations to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const duration = Date.now() - startTime;

    console.log(`🏁 [AutoImage CRON] Auto-image generation process completed:`, {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      duration: `${duration}ms`
    });

    if (results.errors.length > 0) {
      console.warn('❌ Auto-image generation errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        ...results,
        duration
      },
      message: `Processed ${results.processed} articles, generated ${results.successful} images, failed ${results.failed}`
    });

  } catch (error) {
    console.error('💥 Critical error in auto-image generation CRON:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during auto-image generation',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/auto-image
 * Manual trigger for auto-image generation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual auto-image generation triggered');
    return GET(request);
  } catch (error) {
    console.error('Error in manual auto-image generation trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual auto-image generation' },
      { status: 500 }
    );
  }
}

/**
 * Generate featured image for article using new Image Module
 */
async function generateFeaturedImageWithModule(article: any): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    console.log(`🎨 [AutoImage Module] Generating featured image for article: ${article.id}`);

    // Create Image Module container
    const imageContainer = createImageContainer();

    // Prepare input for Image Module
    const imageInput = {
      articleId: article.id,
      title: article.title,
      content: article.content || '',
      aiPrompt: generateImagePrompt(article.title, article.content),
      filename: `featured-${article.id}.png`,
      altText: `Immagine in evidenza per: ${article.title}`,
      style: 'natural' as const,
      size: '1792x1024' as const
    };

    console.log(`🎨 [AutoImage Module] Input prepared:`, {
      articleId: imageInput.articleId,
      title: imageInput.title,
      filename: imageInput.filename,
      style: imageInput.style,
      size: imageInput.size
    });

    // Execute image generation through Image Module
    const result = await imageContainer.imageAdminFacade.execute('GenerateImage', imageInput);

    if (result.isFailure()) {
      console.error('❌ [AutoImage Module] Image generation failed:', result.error.message);
      return {
        success: false,
        error: result.error.message
      };
    }

    const generatedImage = result.value;
    console.log(`✅ [AutoImage Module] Image generated successfully:`, {
      imageId: generatedImage.imageId,
      url: generatedImage.url,
      status: generatedImage.status
    });

    return {
      success: true,
      imageUrl: generatedImage.url
    };

  } catch (error) {
    console.error(`💥 [AutoImage Module] Error in generateFeaturedImageWithModule:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate image prompt based on article content
 */
function generateImagePrompt(title: string, content: string): string {
  // Extract key themes from title and content for image generation
  const cleanTitle = title.replace(/[^\w\s]/gi, '').toLowerCase();

  // Create a focused prompt for DALL-E
  const prompt = `Create a professional, high-quality featured image for an article titled "${title}".
The image should be:
- Modern and clean design
- Relevant to the article topic
- Professional and engaging
- Suitable for a news/blog website
- No text overlays
- High contrast and clear
Style: photorealistic, modern, clean`;

  return prompt;
}