import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { PrismaPublicationRepository } from '@/modules/publishing/infrastructure/repositories/PrismaPublicationRepository';
import { WordPressPublishingService } from '@/modules/publishing/infrastructure/services/WordPressPublishingService';
import { PublishArticle } from '@/modules/publishing/application/use-cases/PublishArticle';
import { PublicationTarget } from '@/modules/publishing/domain/value-objects/PublicationTarget';

/**
 * Publishes an article to a specified platform
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      articleId,
      target,
      content,
      metadata,
      featuredImage, // ✅ NEW: Featured image data
      scheduledAt,
      allowDuplicate = false
    } = body;

    // Validate required fields
    if (!articleId || !target || !content || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, target, content, metadata' },
        { status: 400 }
      );
    }

    // Validate content structure
    if (!content.title || !content.content) {
      return NextResponse.json(
        { error: 'Content must have title and content fields' },
        { status: 400 }
      );
    }

    // Create publication target
    let publicationTarget: PublicationTarget;
    try {
      // Validate target is properly structured
      if (!target || typeof target !== 'object') {
        throw new Error('Target must be an object');
      }

      if (target.platform === 'wordpress') {
        // Validate configuration fields are present
        if (!target.configuration || !target.configuration.username || !target.configuration.password) {
          throw new Error('WordPress configuration must have username and password');
        }

        // Create PublicationTarget using fromValue to avoid constructor validation issues
        const targetValue = {
          platform: target.platform,
          siteId: target.siteId,
          siteUrl: target.siteUrl,
          configuration: target.configuration
        };

        // SIMPLIFIED APPROACH: Call WordPress API directly to bypass PublicationTarget issues
        console.log('API - Attempting direct WordPress publishing');

        // ✅ STEP 1: Upload featured image if provided
        let featuredMediaId = null;
        if (featuredImage) {
          console.log('🖼️ [WordPress] Starting featured image upload process');
          console.log('🖼️ [WordPress] Image details:', {
            url: featuredImage.url.substring(0, 80) + '...',
            filename: featuredImage.filename,
            altText: featuredImage.altText?.substring(0, 50),
            siteUrl: target.siteUrl
          });

          try {
            featuredMediaId = await uploadImageToWordPressWithRetry(
              featuredImage.url,
              featuredImage.filename,
              featuredImage.altText,
              target.siteUrl,
              target.configuration.username,
              target.configuration.password
            );

            if (featuredMediaId) {
              console.log('✅ [WordPress] Image uploaded successfully. Media ID:', featuredMediaId);
              console.log('🔗 [WordPress] Featured image will be linked to post');
            } else {
              console.warn('⚠️ [WordPress] Image upload returned null/undefined media ID');
            }
          } catch (imageError) {
            console.error('❌ [WordPress] Image upload failed after retries:', {
              error: imageError instanceof Error ? imageError.message : imageError,
              imageUrl: featuredImage.url,
              siteUrl: target.siteUrl
            });
            // Continue without featured image rather than failing the whole publication
          }
        }

        // Create WordPress post data
        const postData = {
          title: content.title,
          content: content.content,
          status: target.configuration.status || 'draft',
          excerpt: content.excerpt
        };

        if (metadata.categories) {
          postData.categories = metadata.categories;
        }
        if (metadata.tags) {
          postData.tags = metadata.tags;
        }
        // ✅ FEATURED IMAGE: Set the uploaded image as featured media
        if (featuredMediaId) {
          postData.featured_media = featuredMediaId;
        } else if (metadata.featuredMediaId) {
          postData.featured_media = metadata.featuredMediaId;
        }

        console.log('API - Post data prepared:', JSON.stringify(postData));

        // Make WordPress REST API request
        const wpUrl = `${target.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
        const authHeader = `Basic ${Buffer.from(`${target.configuration.username}:${target.configuration.password}`).toString('base64')}`;

        console.log('API - WordPress URL:', wpUrl);
        console.log('API - Auth header created');

        const wpResponse = await fetch(wpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(postData)
        });

        console.log('API - WordPress response status:', wpResponse.status);

        if (!wpResponse.ok) {
          const errorData = await wpResponse.json().catch(() => ({ message: `HTTP ${wpResponse.status}` }));
          console.log('API - WordPress error:', JSON.stringify(errorData));

          return NextResponse.json({
            error: `WordPress publishing failed: ${errorData.message || wpResponse.statusText}`,
            details: { httpStatus: wpResponse.status, errorData }
          }, { status: 400 });
        }

        const wpResult = await wpResponse.json();
        console.log('API - WordPress success:', JSON.stringify(wpResult));

        // Create publication record in database
        console.log('API - About to create publication record');
        console.log('API - prisma object:', typeof prisma, !!prisma);
        console.log('API - prisma.publication:', typeof prisma?.publication, !!prisma?.publication);

        if (!prisma) {
          console.error('API - Prisma is undefined!');
          throw new Error('Database connection not available');
        }

        const publication = await prisma.publication.create({
          data: {
            articleId,
            externalId: wpResult.id.toString(),
            externalUrl: wpResult.link,
            status: 'completed',
            platform: 'wordpress',
            target: targetValue,
            content,
            metadata,
            publishedAt: new Date(),
            retryCount: 0
          }
        });

        console.log('API - Publication record created:', publication.id);

        return NextResponse.json({
          success: true,
          data: {
            publicationId: publication.id,
            externalId: wpResult.id.toString(),
            externalUrl: wpResult.link,
            status: 'completed',
            publishedAt: wpResult.date,
            message: 'Article published successfully to WordPress!'
          }
        });

        // OLD CODE (commented out):
        // publicationTarget = PublicationTarget.fromValue(targetValue);
      } else {
        return NextResponse.json(
          { error: `Unsupported platform: ${target.platform}` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error in WordPress publishing:', error);
      return NextResponse.json(
        { error: `WordPress publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    /* OLD CODE - using service pattern (commented out for direct implementation)
    // Initialize services
    const publicationRepository = new PrismaPublicationRepository();
    const publishingService = new WordPressPublishingService();
    const publishArticle = new PublishArticle(publicationRepository, publishingService);

    // Execute publication
    const result = await publishArticle.execute({
      articleId,
      target: publicationTarget,
      content,
      metadata,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      allowDuplicate
    });

    if (result.isFailure()) {
      return NextResponse.json(
        {
          error: result.error.message,
          code: result.error.code,
          details: result.error.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.value
    });
    */

  } catch (error) {
    console.error('Error publishing article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Gets publications with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const articleId = searchParams.get('articleId');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const retryableOnly = searchParams.get('retryableOnly') === 'true';
    const readyForExecution = searchParams.get('readyForExecution') === 'true';
    
    // Build where clause
    const where: any = {};
    
    if (articleId) {
      where.articleId = articleId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (platform) {
      where.target = {
        path: ['platform'],
        equals: platform
      };
    }
    
    if (retryableOnly) {
      where.status = 'failed';
      where.retryCount = {
        lt: where.maxRetries || 3
      };
    }
    
    if (readyForExecution) {
      where.OR = [
        { status: 'pending' },
        {
          status: 'scheduled',
          scheduledAt: {
            lte: new Date()
          }
        }
      ];
    }

    // Get total count
    const total = await prisma.publication.count({ where });
    
    // Get publications with pagination
    const publications = await prisma.publication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        publications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting publications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Upload an image to WordPress media library
 *
 * @param imageUrl - URL of the image to download and upload
 * @param filename - Desired filename for the image
 * @param altText - Alt text for the image
 * @param siteUrl - WordPress site URL
 * @param username - WordPress username
 * @param password - WordPress password
 * @returns Promise<number> - WordPress media ID
 */
async function uploadImageToWordPress(
  imageUrl: string,
  filename: string,
  altText: string,
  siteUrl: string,
  username: string,
  password: string
): Promise<number> {
  console.log('🔄 [WordPress Media] Starting image upload process');

  // Step 1: Download the image from the external URL
  console.log('📥 [WordPress Media] Downloading image from:', imageUrl);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageData = new Uint8Array(imageBuffer);

  console.log('✅ [WordPress Media] Image downloaded, size:', imageData.length, 'bytes');

  // Step 2: Determine content type
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  console.log('📄 [WordPress Media] Content type:', contentType);

  // Step 3: Prepare WordPress media upload
  const wpMediaUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  // Step 4: Upload to WordPress
  console.log('📤 [WordPress Media] Uploading to WordPress:', wpMediaUrl);

  const uploadResponse = await fetch(wpMediaUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    },
    body: imageData
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({ message: `HTTP ${uploadResponse.status}` }));
    console.error('❌ [WordPress Media] Upload failed:', errorData);
    throw new Error(`WordPress media upload failed: ${errorData.message || uploadResponse.statusText}`);
  }

  const mediaResult = await uploadResponse.json();
  console.log('✅ [WordPress Media] Upload successful:', mediaResult.id);

  // Step 5: Update media metadata (alt text, title)
  if (altText) {
    try {
      console.log('🏷️ [WordPress Media] Updating alt text:', altText);

      const updateResponse = await fetch(`${wpMediaUrl}/${mediaResult.id}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alt_text: altText,
          title: altText,
          caption: altText
        })
      });

      if (updateResponse.ok) {
        console.log('✅ [WordPress Media] Alt text updated successfully');
      } else {
        console.warn('⚠️ [WordPress Media] Alt text update failed, but continuing...');
      }
    } catch (altError) {
      console.warn('⚠️ [WordPress Media] Alt text update error:', altError);
      // Don't fail the whole process for alt text issues
    }
  }

  return mediaResult.id;
}

/**
 * Upload image to WordPress with automatic retry and enhanced logging
 */
async function uploadImageToWordPressWithRetry(
  imageUrl: string,
  filename: string,
  altText: string,
  siteUrl: string,
  username: string,
  password: string,
  maxRetries: number = 3
): Promise<number> {
  console.log('🔄 [WordPress Retry] Starting upload with retry mechanism');

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎯 [WordPress Retry] Attempt ${attempt}/${maxRetries}`);

      // Add delay between retries (except first attempt)
      if (attempt > 1) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.log(`⏱️ [WordPress Retry] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const mediaId = await uploadImageToWordPress(
        imageUrl,
        filename,
        altText,
        siteUrl,
        username,
        password
      );

      console.log(`✅ [WordPress Retry] Success on attempt ${attempt}. Media ID: ${mediaId}`);

      // Validate the media ID
      if (!mediaId || isNaN(mediaId) || mediaId <= 0) {
        throw new Error(`Invalid media ID returned: ${mediaId}`);
      }

      // Additional validation: verify the uploaded media exists
      const verificationResult = await verifyUploadedMedia(mediaId, siteUrl, username, password);
      if (verificationResult) {
        console.log(`🔍 [WordPress Retry] Upload verified successfully`);
        return mediaId;
      } else {
        throw new Error('Uploaded media verification failed');
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Upload failed: ${error}`);

      console.error(`❌ [WordPress Retry] Attempt ${attempt} failed:`, {
        error: lastError.message,
        imageUrl: imageUrl.substring(0, 80) + '...',
        attempt,
        maxRetries
      });

      // If this was the last attempt, don't continue
      if (attempt === maxRetries) {
        break;
      }

      // Log retry information
      console.log(`🔄 [WordPress Retry] Will retry... (${maxRetries - attempt} attempts remaining)`);
    }
  }

  // All retries failed
  console.error(`💥 [WordPress Retry] All ${maxRetries} attempts failed:`, {
    finalError: lastError?.message || 'Unknown error',
    imageUrl: imageUrl.substring(0, 80) + '...',
    filename,
    siteUrl
  });

  throw new Error(`WordPress image upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Verify that the uploaded media exists and is accessible
 */
async function verifyUploadedMedia(
  mediaId: number,
  siteUrl: string,
  username: string,
  password: string
): Promise<boolean> {
  try {
    console.log(`🔍 [WordPress Verify] Checking media ID ${mediaId}...`);

    const wpMediaUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media/${mediaId}`;
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await fetch(wpMediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const mediaData = await response.json();
      console.log(`✅ [WordPress Verify] Media verified:`, {
        id: mediaData.id,
        title: mediaData.title?.rendered?.substring(0, 50),
        url: mediaData.source_url?.substring(0, 80) + '...',
        altText: mediaData.alt_text?.substring(0, 50)
      });
      return true;
    } else {
      console.warn(`⚠️ [WordPress Verify] Verification failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠️ [WordPress Verify] Verification error:`, error);
    return false; // Don't fail the whole process for verification issues
  }
}