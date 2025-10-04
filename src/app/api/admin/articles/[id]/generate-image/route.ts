import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { createImageContainer } from '@/composition-root/modules/image';

/**
 * POST /api/admin/articles/[id]/generate-image
 * Genera un'immagine in evidenza manualmente per un articolo specifico
 * con prompt personalizzato e placeholder {title} e {article}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;
    const body = await request.json();

    console.log(`🎨 [Manual Image Generation] Starting for article: ${articleId}`);

    // Validate request body
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Get the article
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        sourceId: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if article is in correct status for manual image generation
    if (article.status !== 'generated_image_draft') {
      return NextResponse.json(
        {
          error: `Cannot generate image for article in status "${article.status}". Article must be in "generated_image_draft" status.`
        },
        { status: 400 }
      );
    }

    // Process prompt with placeholders
    const processedPrompt = replacePromptPlaceholders(body.prompt, {
      title: article.title,
      article: article.content || ''
    });

    console.log(`🔧 [Manual Image Generation] Original prompt: ${body.prompt}`);
    console.log(`🔧 [Manual Image Generation] Processed prompt: ${processedPrompt}`);

    // Save the custom prompt to database for future reference
    await saveCustomImagePrompt(articleId, body.prompt, processedPrompt);

    // Get Image Module container
    const imageContainer = createImageContainer();

    // Prepare input for Image Module
    const imageInput = {
      articleId: article.id,
      title: article.title,
      content: article.content || '',
      aiPrompt: processedPrompt,
      filename: `manual-featured-${article.id}-${Date.now()}.png`,
      altText: `Immagine in evidenza per: ${article.title}`,
      style: (body.style || 'natural') as 'natural' | 'vivid',
      size: (body.size || '1792x1024') as '1792x1024' | '1024x1024' | '1024x1792',
      model: body.model || 'dall-e-3' // For now only DALL-E 3
    };

    console.log(`🎨 [Manual Image Generation] Image generation input:`, {
      articleId: imageInput.articleId,
      title: imageInput.title,
      filename: imageInput.filename,
      style: imageInput.style,
      size: imageInput.size,
      model: imageInput.model,
      promptLength: processedPrompt.length
    });

    // Execute image generation through Image Module
    const result = await imageContainer.imageAdminFacade.execute('GenerateImage', imageInput);

    if (result.isFailure()) {
      console.error('❌ [Manual Image Generation] Image generation failed:', result.error.message);
      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: result.error.message
        },
        { status: 500 }
      );
    }

    const generatedImage = result.value;
    console.log(`✅ [Manual Image Generation] Image generated successfully:`, {
      imageId: generatedImage.imageId,
      url: generatedImage.url,
      status: generatedImage.status
    });

    // Return the generated image for preview (don't update article status yet)
    return NextResponse.json({
      success: true,
      data: {
        image: {
          id: generatedImage.imageId,
          url: generatedImage.url,
          filename: imageInput.filename,
          altText: imageInput.altText,
          style: imageInput.style,
          size: imageInput.size,
          model: imageInput.model
        },
        prompt: {
          original: body.prompt,
          processed: processedPrompt
        },
        article: {
          id: article.id,
          title: article.title,
          status: article.status
        }
      }
    });

  } catch (error) {
    console.error('💥 Manual image generation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/articles/[id]/generate-image
 * Accetta o rifiuta l'immagine generata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;
    const body = await request.json();

    console.log(`🎯 [Image Decision] Processing for article: ${articleId}`);

    if (!body.action || !['accept', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "reject"' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (article.status !== 'generated_image_draft') {
      return NextResponse.json(
        {
          error: `Cannot update image for article in status "${article.status}"`
        },
        { status: 400 }
      );
    }

    if (body.action === 'accept') {
      // Accept the image - move article to generated_with_image
      const updateData: any = {
        status: 'generated_with_image'
      };

      // If image URL is provided, save it
      if (body.imageUrl) {
        updateData.featuredMediaUrl = body.imageUrl;
      }

      // If WordPress media ID is provided, save it
      if (body.wordPressMediaId) {
        updateData.featuredMediaId = body.wordPressMediaId;
      }

      await prisma.article.update({
        where: { id: articleId },
        data: updateData
      });

      console.log(`✅ [Image Decision] Image accepted for article: ${articleId} → status: generated_with_image`);

      return NextResponse.json({
        success: true,
        data: {
          articleId,
          action: 'accepted',
          newStatus: 'generated_with_image',
          message: 'Image accepted successfully. Article moved to generated_with_image status.'
        }
      });

    } else {
      // Reject the image - article stays in generated_image_draft
      console.log(`❌ [Image Decision] Image rejected for article: ${articleId} → status remains: generated_image_draft`);

      return NextResponse.json({
        success: true,
        data: {
          articleId,
          action: 'rejected',
          newStatus: 'generated_image_draft',
          message: 'Image rejected. Article remains in generated_image_draft status. You can generate a new image.'
        }
      });
    }

  } catch (error) {
    console.error('💥 Image decision API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Replace placeholders in prompt with actual article data
 */
function replacePromptPlaceholders(prompt: string, data: { title: string; article: string }): string {
  let processedPrompt = prompt;

  // Replace {title} placeholder
  processedPrompt = processedPrompt.replace(/\{title\}/g, data.title);

  // Replace {article} placeholder with truncated content (max 500 chars for context)
  const truncatedArticle = data.article.length > 500
    ? data.article.substring(0, 500) + '...'
    : data.article;

  processedPrompt = processedPrompt.replace(/\{article\}/g, truncatedArticle);

  return processedPrompt;
}

/**
 * Save custom image prompt to database for tracking and future reference
 */
async function saveCustomImagePrompt(
  articleId: string,
  originalPrompt: string,
  processedPrompt: string
): Promise<void> {
  try {
    // Save to article metadata or create a separate table
    // For now, we'll update the article's aiPrompts field
    await prisma.article.update({
      where: { id: articleId },
      data: {
        aiPrompts: {
          ...(await prisma.article.findUnique({
            where: { id: articleId },
            select: { aiPrompts: true }
          }))?.aiPrompts || {},
          customImagePrompt: originalPrompt,
          processedImagePrompt: processedPrompt,
          imagePromptCreatedAt: new Date().toISOString()
        }
      }
    });

    console.log(`💾 [Manual Image Generation] Custom prompt saved for article: ${articleId}`);
  } catch (error) {
    console.error('⚠️ [Manual Image Generation] Failed to save custom prompt:', error);
    // Don't fail the entire operation if prompt saving fails
  }
}