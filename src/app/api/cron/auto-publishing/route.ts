import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { determineArticleCategories, getCategorySource } from '@/shared/utils/categoryUtils';

/**
 * GET /api/cron/auto-publish
 * Cron endpoint che pubblica automaticamente gli articoli in status "generated"
 * quando l'auto-pubblicazione è abilitata nelle impostazioni WordPress
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🚀 [AutoPublish CRON] Starting auto-publish process...');
    const startTime = Date.now();

    // Check if auto-publishing is enabled in WordPress settings
    const wordpressSite = await prisma.wordPressSite.findFirst({
      where: { isActive: true }
    });

    if (!wordpressSite) {
      console.log('⚠️ [AutoPublish CRON] No active WordPress site found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No active WordPress site configured',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    if (!wordpressSite.enableAutoPublish) {
      console.log('⚠️ [AutoPublish CRON] Auto-publishing is disabled in WordPress settings');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Auto-publishing is disabled',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    console.log(`✅ [AutoPublish CRON] Auto-publishing is enabled for: ${wordpressSite.name}`);

    // Find all articles that should be auto-published
    // ✅ INCLUDE: Both 'ready_to_publish' AND 'generated_with_image' for auto-publish
    const readyArticles = await prisma.article.findMany({
      where: {
        status: { in: ['ready_to_publish', 'generated_with_image'] }
      },
      orderBy: {
        createdAt: 'asc' // Publish oldest first
      },
      take: 10 // Limit to 10 articles per run to avoid overload
    });

    console.log(`📊 [AutoPublish CRON] Found ${readyArticles.length} articles ready to auto-publish`);

    if (readyArticles.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'No articles ready for auto-publishing',
        results: { processed: 0, published: 0, failed: 0 }
      });
    }

    const results = {
      processed: 0,
      published: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each article for auto-publishing
    for (const article of readyArticles) {
      try {
        console.log(`📤 [AutoPublish CRON] Processing article: ${article.id} - "${article.title}"`);
        results.processed++;

        // Use the existing auto-publish functionality from AutoGenerateArticles
        const { autoPublishArticle } = await import('@/modules/content/application/use-cases/AutoGenerateArticles');

        // For now, simulate the auto-publishing by using the WordPress publishing service directly
        const { WordPressPublishingService } = await import('@/modules/publishing/infrastructure/services/WordPressPublishingService');
        const { PublicationTarget } = await import('@/modules/publishing/domain/value-objects/PublicationTarget');

        const publishingService = new WordPressPublishingService();

        // Create publication target (FIXED: correct parameter order)
        console.log(`🔍 [DEBUG] WordPress site data:`, {
          id: wordpressSite.id,
          url: wordpressSite.url,
          username: wordpressSite.username ? '[SET]' : '[NOT SET]',
          password: wordpressSite.password ? '[SET]' : '[NOT SET]',
          defaultStatus: wordpressSite.defaultStatus
        });

        const config = {
          username: wordpressSite.username,
          password: wordpressSite.password,
          status: wordpressSite.defaultStatus || 'publish'
        };

        console.log(`🔍 [DEBUG] Config object:`, config);
        console.log(`🔍 [DEBUG] Calling PublicationTarget.wordpress with:`, {
          siteUrl: wordpressSite.url,
          siteId: wordpressSite.id,
          configType: typeof config,
          configKeys: Object.keys(config)
        });

        const publicationTarget = PublicationTarget.wordpress(
          wordpressSite.id,     // siteId first (CORRECT)
          wordpressSite.url,    // siteUrl second (CORRECT)
          config
        );

        // ✅ STEP 1: Check for featured image and upload to WordPress if needed
        let featuredMediaId: number | undefined;
        let featuredImageUrl: string | undefined;

        console.log(`🖼️ [AutoPublish] Checking for featured image for article: ${article.id}`);

        // Query for featured image associated with this article
        const featuredImage = await prisma.featuredImage.findFirst({
          where: {
            articleId: article.id,
            status: { in: ['found', 'generated', 'uploaded'] }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (featuredImage) {
          console.log(`🖼️ [AutoPublish] Found featured image:`, {
            imageId: featuredImage.id,
            status: featuredImage.status,
            hasUrl: !!featuredImage.url,
            hasWordPressId: !!featuredImage.wordpressMediaId
          });

          // If image already uploaded to WordPress, use existing ID
          if (featuredImage.status === 'uploaded' && featuredImage.wordpressMediaId) {
            featuredMediaId = featuredImage.wordpressMediaId;
            featuredImageUrl = featuredImage.wordpressUrl || featuredImage.url;
            console.log(`✅ [AutoPublish] Using existing WordPress media ID: ${featuredMediaId}`);
          }
          // If image generated/found but not uploaded, upload it now
          else if ((featuredImage.status === 'generated' || featuredImage.status === 'found') && featuredImage.url) {
            console.log(`📤 [AutoPublish] Uploading featured image to WordPress...`);

            try {
              // Import WordPress media service
              const { WordPressMediaService } = await import('@/modules/publishing/infrastructure/services/WordPressMediaService');
              const mediaService = new WordPressMediaService();

              // Download the image from DALL-E URL
              const imageResponse = await fetch(featuredImage.url);
              if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status}`);
              }

              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
              const imageFile = new File([imageBlob], featuredImage.filename || 'featured-image.png', { type: 'image/png' });

              // Upload to WordPress
              const uploadResult = await mediaService.uploadMedia({
                siteUrl: wordpressSite.url,
                username: wordpressSite.username,
                password: wordpressSite.password
              }, {
                file: imageFile,
                title: featuredImage.altText || article.title,
                alt_text: featuredImage.altText || article.title,
                caption: featuredImage.altText || article.title
              });

              if (uploadResult.isSuccess()) {
                const mediaResult = uploadResult.value;
                featuredMediaId = mediaResult.id;
                featuredImageUrl = mediaResult.url;

                // Update featured image record with WordPress info
                await prisma.featuredImage.update({
                  where: { id: featuredImage.id },
                  data: {
                    status: 'uploaded',
                    wordpressMediaId: mediaResult.id,
                    wordpressUrl: mediaResult.url
                  }
                });

                console.log(`✅ [AutoPublish] Image uploaded to WordPress:`, {
                  mediaId: mediaResult.id,
                  mediaUrl: mediaResult.url
                });
              } else {
                console.error(`❌ [AutoPublish] Failed to upload image to WordPress:`, uploadResult.error);
                // Continue without featured image
              }
            } catch (uploadError) {
              console.error(`💥 [AutoPublish] Error during image upload:`, uploadError);
              // Continue without featured image
            }
          }
        } else {
          console.log(`ℹ️ [AutoPublish] No featured image found for article: ${article.id}`);
        }

        // ✅ ENHANCED: Get source information for category determination
        const articleWithSource = await prisma.article.findUnique({
          where: { id: article.id },
          include: { source: true }
        });

        // ✅ ENHANCED: Determine categories with proper priority (Source > WordPress Site > None)
        const articleCategories = determineArticleCategories(
          articleWithSource?.source?.defaultCategory,
          wordpressSite.defaultCategory
        );
        const categorySource = getCategorySource(
          articleWithSource?.source?.defaultCategory,
          wordpressSite.defaultCategory
        );

        console.log(`📂 [AutoPublish-CategoryLogic] Article ${article.id} using categories from ${categorySource}:`, articleCategories);

        // ✅ STEP 2: Prepare content and metadata with featured image info
        const content = {
          title: article.title,
          content: article.content,
          excerpt: article.title.substring(0, 150),
          categories: articleCategories,
          tags: [],
          featuredImage: featuredImageUrl || null,
          customFields: {}
        };

        const metadata = {
          articleId: article.id,
          sourceId: article.sourceId || '',
          generatedAt: new Date(),
          autoPublished: true,
          ...(featuredMediaId && { featuredMediaId }),
          ...(featuredImageUrl && { featuredImageUrl })
        };

        // ✅ ENHANCED LOGGING: Show exactly what's being published
        console.log(`📰 [AutoPublish] Publishing article ${article.id} with data:`, {
          articleId: article.id,
          title: content.title,
          contentLength: content.content?.length || 0,
          hasFeaturedImage: !!featuredImageUrl,
          featuredImageUrl: featuredImageUrl ? featuredImageUrl.substring(0, 80) + '...' : null,
          featuredMediaId,
          metadataKeys: Object.keys(metadata),
          targetPlatform: publicationTarget.getPlatform(),
          targetSiteUrl: publicationTarget.getSiteUrl()
        });

        // Attempt to publish
        const publishResult = await publishingService.publish(publicationTarget, content, metadata);

        if (publishResult.isSuccess()) {
          // Update article status to published
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'published',
              publishedAt: new Date()
            }
          });

          results.published++;
          console.log(`✅ [AutoPublish CRON] Article published successfully:`, {
            articleId: article.id,
            title: article.title,
            externalUrl: publishResult.value.externalUrl || 'WordPress',
            externalId: publishResult.value.externalId,
            featuredMediaId: featuredMediaId || 'none',
            featuredImageUrl: featuredImageUrl || 'none'
          });
        } else {
          results.failed++;
          results.errors.push(`${article.id}: ${publishResult.error.message}`);
          console.error(`❌ [AutoPublish CRON] Failed to publish article ${article.id}:`, publishResult.error.message);
        }

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${article.id}: ${errorMsg}`);
        console.error(`💥 [AutoPublish CRON] Error processing article ${article.id}:`, error);
      }

      // Small delay between publications to avoid overwhelming WordPress
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Date.now() - startTime;

    console.log(`🏁 [AutoPublish CRON] Auto-publish process completed:`, {
      processed: results.processed,
      published: results.published,
      failed: results.failed,
      duration: `${duration}ms`
    });

    if (results.errors.length > 0) {
      console.warn('❌ Auto-publish errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        ...results,
        duration
      },
      message: `Processed ${results.processed} articles, published ${results.published}, failed ${results.failed}`
    });

  } catch (error) {
    console.error('💥 Critical error in auto-publish CRON:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during auto-publishing',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/auto-publish
 * Manual trigger for auto-publishing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual auto-publish triggered');
    return GET(request);
  } catch (error) {
    console.error('Error in manual auto-publish trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger manual auto-publishing' },
      { status: 500 }
    );
  }
}