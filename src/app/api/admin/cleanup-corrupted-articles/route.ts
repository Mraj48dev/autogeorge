import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/cleanup-corrupted-articles
 * Fixes articles that have JSON stored in title/content fields instead of extracted values
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of corrupted articles...');

    // Find potentially corrupted articles
    const corruptedArticles = await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: 'basic_data' } },
          { title: { contains: '{' } },
          { content: { startsWith: '{"article":' } },
          { content: { contains: '"basic_data":' } }
        ]
      }
    });

    console.log(`🔍 Found ${corruptedArticles.length} potentially corrupted articles`);

    const results = {
      total: corruptedArticles.length,
      fixed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const article of corruptedArticles) {
      try {
        console.log(`🔧 Processing article: ${article.id}`);

        // Try to extract data from JSON content
        let extractedData = null;

        // Method 1: Try to parse content as JSON
        if (article.content && (article.content.startsWith('{') || article.content.includes('{"article":'))) {
          try {
            const jsonContent = article.content.trim();
            const parsed = JSON.parse(jsonContent);

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
            }
          } catch (parseError) {
            console.log(`❌ Failed to parse JSON for article ${article.id}:`, parseError);
          }
        }

        // If we successfully extracted data, update the article
        if (extractedData) {
          await prisma.article.update({
            where: { id: article.id },
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

          console.log(`✅ Fixed article ${article.id}: "${extractedData.title}"`);
          results.fixed++;
        } else {
          console.log(`⚠️ Could not extract data from article ${article.id}, skipping`);
          results.skipped++;
        }

      } catch (error) {
        const errorMsg = `Failed to process article ${article.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`💥 ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log('🎯 Cleanup completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Corrupted articles cleanup completed',
      results
    });

  } catch (error) {
    console.error('💥 Cleanup API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cleanup-corrupted-articles
 * Preview which articles would be cleaned up without actually fixing them
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Previewing corrupted articles...');

    // Find potentially corrupted articles
    const corruptedArticles = await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: 'basic_data' } },
          { title: { contains: '{' } },
          { content: { startsWith: '{"article":' } },
          { content: { contains: '"basic_data":' } }
        ]
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true
      }
    });

    const preview = corruptedArticles.map(article => ({
      id: article.id,
      title: article.title.substring(0, 100) + (article.title.length > 100 ? '...' : ''),
      createdAt: article.createdAt.toISOString(),
      status: article.status,
      isCorrupted: {
        titleContainsJson: article.title.includes('{') || article.title.includes('basic_data'),
        likelyJsonContent: article.title.startsWith('{"') || article.title.includes('"basic_data"')
      }
    }));

    return NextResponse.json({
      success: true,
      message: 'Preview of corrupted articles',
      count: corruptedArticles.length,
      articles: preview
    });

  } catch (error) {
    console.error('💥 Preview API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}