import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles/[id]
 * Gets a specific article with complete details and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get the article with source and feed item information
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            type: true,
            url: true,
            defaultCategory: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Try to find the associated feed item to get generation metadata
    const feedItem = await prisma.feedItem.findFirst({
      where: {
        articleId: article.id
      },
      include: {
        source: true
      }
    });

    // Calculate statistics
    const contentLength = article.content?.length || 0;
    const wordCount = Math.floor(contentLength / 5);
    const sentenceCount = (article.content?.match(/[.!?]+/g) || []).length;
    const paragraphCount = (article.content?.split(/\n\s*\n/) || []).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Extract potential SEO data from content (if it exists)
    const extractSeoFromContent = (content: string) => {
      const lines = content.split('\n');
      const seoData = {
        metaDescription: '',
        keywords: [] as string[],
        tags: [] as string[]
      };

      // Look for structured metadata in content
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('meta description') || trimmed.includes('Meta Description')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) seoData.metaDescription = match[1].trim();
        }
        if (trimmed.includes('keywords') || trimmed.includes('Keywords')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) {
            seoData.keywords = match[1].split(',').map(k => k.trim()).filter(k => k);
          }
        }
        if (trimmed.includes('tags') || trimmed.includes('Tags')) {
          const match = trimmed.match(/[:](.*)/);
          if (match) {
            seoData.tags = match[1].split(',').map(t => t.trim()).filter(t => t);
          }
        }
      });

      return seoData;
    };

    const seoData = extractSeoFromContent(article.content || '');

    // Build the response with enhanced data
    const response = {
      success: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          content: article.content,
          slug: article.slug,
          status: article.status,
          sourceId: article.sourceId,
          metaDescription: article.yoastSeo ? (article.yoastSeo as any)?.meta_description : null,
          createdAt: article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString()
        },
        source: article.source ? {
          id: article.source.id,
          name: article.source.name,
          type: article.source.type,
          url: article.source.url,
          defaultCategory: article.source.defaultCategory
        } : null,
        feedItem: feedItem ? {
          id: feedItem.id,
          title: feedItem.title,
          url: feedItem.url,
          publishedAt: feedItem.publishedAt.toISOString(),
          processed: feedItem.processed
        } : null,
        statistics: {
          characterCount: contentLength,
          wordCount,
          sentenceCount,
          paragraphCount,
          readingTime
        },
        seo: {
          metaDescription: seoData.metaDescription || `Articolo: ${article.title.substring(0, 150)}...`,
          keywords: seoData.keywords,
          tags: seoData.tags,
          estimatedSeoScore: seoData.metaDescription && seoData.keywords.length > 0 ? 85 : 60
        },
        metadata: {
          generationType: feedItem ? '3-step-workflow' : 'simple-generation',
          originalUrl: feedItem?.url || null,
          isFromFeed: !!feedItem,
          generationDate: article.createdAt.toISOString(),
          lastModified: article.updatedAt.toISOString()
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get article API error:', error);
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
 * PATCH /api/admin/articles/[id]
 * Fix corrupted article by extracting proper data from JSON content
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;
    const body = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get the current article
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if this is a cleanup operation
    if (body.action === 'fix-corruption') {
      console.log(`🔧 Fixing corrupted article: ${articleId}`);

      // Try to extract data from JSON content
      let extractedData = null;

      // Method 1: Try to parse content as JSON (with truncation recovery)
      if (article.content && (article.content.startsWith('{') || article.content.includes('{"article":'))) {
        try {
          const jsonContent = article.content.trim();
          const parsed = JSON.parse(jsonContent);

          console.log(`🔍 Parsed JSON structure for ${articleId}:`, Object.keys(parsed));

          // Check for advanced structure
          if (parsed.article && parsed.article.basic_data && parsed.article.content) {
            extractedData = {
              title: parsed.article.basic_data.title || 'Recovered Article',
              content: parsed.article.content || 'Content recovered from JSON.',
              slug: parsed.article.basic_data.slug || null,
              meta_description: parsed.article.seo_critical?.meta_description || null,
              tags: parsed.article.basic_data?.tags || [],
              ai_image_prompt: parsed.article.featured_image?.ai_prompt || null
            };
            console.log(`✅ Extracted data from advanced structure for ${articleId}`);
          }
          // Check for simple structure
          else if (parsed.title && parsed.content) {
            extractedData = {
              title: parsed.title,
              content: parsed.content,
              slug: parsed.slug || null,
              meta_description: parsed.meta_description || null,
              tags: parsed.tags || [],
              ai_image_prompt: parsed.ai_image_prompt || null
            };
            console.log(`✅ Extracted data from simple structure for ${articleId}`);
          } else {
            console.log(`⚠️ Unknown JSON structure for ${articleId}:`, {
              hasArticle: !!parsed.article,
              hasBasicData: !!(parsed.article?.basic_data),
              hasContent: !!(parsed.article?.content),
              hasTitle: !!parsed.title,
              hasDirectContent: !!parsed.content,
              topLevelKeys: Object.keys(parsed)
            });
          }
        } catch (parseError) {
          console.log(`❌ JSON parse failed for ${articleId}, trying truncation recovery:`, parseError.message);

          // TRUNCATION RECOVERY: Try to extract from partial JSON
          try {
            const jsonContent = article.content.trim();

            // Extract title from basic_data
            const titleMatch = jsonContent.match(/"title":\s*"([^"]+)"/);
            const slugMatch = jsonContent.match(/"slug":\s*"([^"]+)"/);
            const metaMatch = jsonContent.match(/"meta_description":\s*"([^"]+)"/);
            const tagsMatch = jsonContent.match(/"tags":\s*\[([^\]]+)\]/);
            // Use better content extraction that handles HTML and escaped quotes
            const contentMatch = jsonContent.match(/"content":\s*"(.*?)(?=",[^"]*"[^"]*":)/s) ||
                                 jsonContent.match(/"content":\s*"([^"]*(?:\\.[^"]*)*)"/);
            const imagePromptMatch = jsonContent.match(/"ai_prompt":\s*"([^"]+)"/);

            if (titleMatch) {
              // Extract tags array
              let tags = [];
              if (tagsMatch) {
                try {
                  const tagsStr = '[' + tagsMatch[1] + ']';
                  tags = JSON.parse(tagsStr);
                } catch (e) {
                  console.log('Failed to parse tags, extracting manually');
                  tags = tagsMatch[1].split(',').map(t => t.replace(/"/g, '').trim()).filter(Boolean);
                }
              }

              // Clean up content (remove escape characters)
              // Use the first match result if it's an array (from the OR operator)
              const rawContent = Array.isArray(contentMatch) ? contentMatch[1] : (contentMatch?.[1] || 'Contenuto recuperato da articolo corrotto.');
              let cleanContent = rawContent;
              cleanContent = cleanContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

              extractedData = {
                title: titleMatch[1],
                content: cleanContent,
                slug: slugMatch ? slugMatch[1] : null,
                meta_description: metaMatch ? metaMatch[1] : null,
                tags: tags,
                ai_image_prompt: imagePromptMatch ? imagePromptMatch[1] : null
              };

              console.log(`🔧 Recovered data from truncated JSON for ${articleId}:`, {
                title: extractedData.title,
                contentLength: extractedData.content.length,
                slug: extractedData.slug,
                tagsCount: extractedData.tags.length
              });
            }
          } catch (recoveryError) {
            console.log(`❌ Truncation recovery failed for ${articleId}:`, recoveryError.message);
          }
        }
      }

      // Method 2: Try to extract from title if it contains JSON start
      if (!extractedData && article.title && article.title.includes('basic_data')) {
        try {
          // Title might be truncated JSON, try to reconstruct from both title and content
          const titlePart = article.title;
          const contentPart = article.content || '';

          // Try to find a complete JSON structure
          const combinedContent = titlePart + contentPart;
          const jsonMatch = combinedContent.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.article && parsed.article.basic_data && parsed.article.content) {
              extractedData = {
                title: parsed.article.basic_data.title || 'Recovered Article',
                content: parsed.article.content || 'Content recovered from JSON.',
                slug: parsed.article.basic_data.slug || null,
                meta_description: parsed.article.seo_critical?.meta_description || null,
                tags: parsed.article.basic_data?.tags || [],
                ai_image_prompt: parsed.article.featured_image?.ai_prompt || null
              };
              console.log(`✅ Extracted data from reconstructed JSON for ${articleId}`);
            }
          }
        } catch (parseError) {
          console.log(`❌ Failed to reconstruct JSON for article ${articleId}:`, parseError);
        }
      }

      // If we successfully extracted data, update the article
      if (extractedData) {
        await prisma.article.update({
          where: { id: articleId },
          data: {
            title: extractedData.title,
            content: extractedData.content,
            slug: extractedData.slug,
            yoastSeo: extractedData.meta_description ? {
              meta_description: extractedData.meta_description
            } : null,
            // Store original corrupted data for reference
            articleData: {
              ...article.articleData,
              cleanupApplied: new Date().toISOString(),
              originalCorruptedTitle: article.title,
              originalCorruptedContent: article.content.substring(0, 1000) + '...',
              extractedData
            }
          }
        });

        console.log(`✅ Fixed article ${articleId}: "${extractedData.title}"`);

        return NextResponse.json({
          success: true,
          message: 'Article corruption fixed',
          extractedData: {
            title: extractedData.title,
            contentLength: extractedData.content.length,
            slug: extractedData.slug,
            metaDescription: extractedData.meta_description
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Could not extract valid data from corrupted article' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Patch article API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}