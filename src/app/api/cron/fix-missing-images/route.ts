import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createImageContainer } from '@/composition-root/modules/image';

/**
 * CRON Job: Fix articles missing featured images
 *
 * Finds published articles on WordPress that have featured_media=0
 * but have generated images that were never uploaded.
 * Uploads the images and updates WordPress posts.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🔧 [Fix Missing Images] Starting retrofix process...');

    // Get WordPress settings
    const wpResponse = await fetch(`https://autogeorge.vercel.app/api/admin/wordpress-settings`, {
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

    console.log('✅ [Fix Missing Images] WordPress configuration loaded');

    // Find published articles with generated images but no WordPress media ID
    const articlesNeedingFix = await prisma.$queryRaw`
      SELECT DISTINCT a.id as article_id, a.title, fi.id as image_id, fi.url, fi.status, fi."wordpressMediaId"
      FROM articles a
      INNER JOIN featured_images fi ON a.id = fi."articleId"
      WHERE a.status = 'published'
      AND fi.status IN ('found', 'generated')
      AND fi."wordpressMediaId" IS NULL
      AND fi.url IS NOT NULL
      AND a."createdAt" > NOW() - INTERVAL '7 days'
      ORDER BY a."createdAt" DESC
      LIMIT 10
    ` as any[];

    console.log(`📊 [Fix Missing Images] Found ${articlesNeedingFix.length} articles needing image fix`);

    if (articlesNeedingFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles need image fixes',
        processed: 0,
        duration: `${Date.now() - startTime}ms`
      });
    }

    // Process each article
    const container = createImageContainer();
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const article of articlesNeedingFix) {
      try {
        console.log(`🖼️ [Fix Missing Images] Processing article: ${article.article_id} - ${article.title}`);

        // Upload image to WordPress
        const uploadResult = await container.imageAdminFacade.execute('UploadImageToWordPress', {
          imageId: article.image_id,
          wordPressConfig
        });

        if (uploadResult.isSuccess()) {
          const mediaId = uploadResult.value.wordPressMediaId;
          console.log(`✅ [Fix Missing Images] Image uploaded: ${article.image_id} → WordPress Media ID ${mediaId}`);

          // Find corresponding WordPress post and update featured_media
          try {
            const searchResponse = await fetch(
              `${wordPressConfig.siteUrl}/wp-json/wp/v2/posts?search=${encodeURIComponent(article.title.substring(0, 50))}&_fields=id,title,featured_media`,
              {
                headers: {
                  'Authorization': `Basic ${Buffer.from(`${wordPressConfig.username}:${wordPressConfig.password}`).toString('base64')}`
                }
              }
            );

            if (searchResponse.ok) {
              const posts = await searchResponse.json();
              const matchingPost = posts.find((post: any) =>
                post.featured_media === 0 &&
                post.title.rendered.includes(article.title.substring(0, 30))
              );

              if (matchingPost) {
                // Update WordPress post with featured_media
                const updateResponse = await fetch(
                  `${wordPressConfig.siteUrl}/wp-json/wp/v2/posts/${matchingPost.id}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Basic ${Buffer.from(`${wordPressConfig.username}:${wordPressConfig.password}`).toString('base64')}`
                    },
                    body: JSON.stringify({ featured_media: mediaId })
                  }
                );

                if (updateResponse.ok) {
                  console.log(`🔗 [Fix Missing Images] WordPress post ${matchingPost.id} updated with featured_media ${mediaId}`);
                  successful++;
                  results.push({
                    articleId: article.article_id,
                    imageId: article.image_id,
                    status: 'success',
                    wordPressPostId: matchingPost.id,
                    wordPressMediaId: mediaId
                  });
                } else {
                  console.error(`❌ [Fix Missing Images] Failed to update WordPress post ${matchingPost.id}`);
                  failed++;
                  results.push({
                    articleId: article.article_id,
                    imageId: article.image_id,
                    status: 'upload_success_link_failed',
                    error: 'Failed to link image to WordPress post'
                  });
                }
              } else {
                console.warn(`⚠️ [Fix Missing Images] No matching WordPress post found for: ${article.title}`);
                failed++;
                results.push({
                  articleId: article.article_id,
                  imageId: article.image_id,
                  status: 'upload_success_post_not_found',
                  error: 'WordPress post not found'
                });
              }
            }
          } catch (error) {
            console.error(`❌ [Fix Missing Images] Error finding/updating WordPress post:`, error);
            failed++;
            results.push({
              articleId: article.article_id,
              imageId: article.image_id,
              status: 'upload_success_link_error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }

        } else {
          console.error(`❌ [Fix Missing Images] Failed to upload image ${article.image_id}:`, uploadResult.error.message);
          failed++;
          results.push({
            articleId: article.article_id,
            imageId: article.image_id,
            status: 'upload_failed',
            error: uploadResult.error.message
          });
        }

      } catch (error) {
        console.error(`💥 [Fix Missing Images] Exception processing ${article.article_id}:`, error);
        failed++;
        results.push({
          articleId: article.article_id,
          imageId: article.image_id,
          status: 'exception',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`🏁 [Fix Missing Images] Process completed: ${successful} successful, ${failed} failed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed: articlesNeedingFix.length,
      successful,
      failed,
      duration: `${duration}ms`,
      results
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [Fix Missing Images] Process failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 });
  }
}