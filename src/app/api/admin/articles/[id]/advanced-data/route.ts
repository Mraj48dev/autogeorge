import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles/[id]/advanced-data
 * Returns structured advanced data extracted from the article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    // Get article with all advanced data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        articleData: true,
        yoastSeo: true,
        tags: true,
        customFields: true,
        aiModel: true,
        createdAt: true,
        source: {
          select: {
            name: true,
            type: true
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

    // Extract advanced data structure
    const rawData = article.articleData as any;
    const advancedData = rawData?.article || {};

    // Build structured response
    const structuredData = {
      // Basic article info
      article_info: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content_length: article.content?.length || 0,
        ai_model: article.aiModel,
        created_at: article.createdAt,
        source: article.source
      },

      // Advanced structure from AI
      basic_data: advancedData.basic_data || {
        title: article.title,
        slug: article.slug,
        category: (article.customFields as any)?.category || null,
        tags: (article.tags as any)?.primary || [],
        status: 'generated'
      },

      seo_critical: advancedData.seo_critical || {
        focus_keyword: (article.customFields as any)?.focus_keyword || null,
        seo_title: (article.yoastSeo as any)?.seo_title || article.title,
        meta_description: (article.yoastSeo as any)?.meta_description || null,
        h1_tag: (article.yoastSeo as any)?.h1_tag || article.title
      },

      content: {
        html: article.content,
        length: article.content?.length || 0,
        word_count: article.content ? article.content.split(/\s+/).length : 0
      },

      featured_image: advancedData.featured_image || {
        ai_prompt: (article.customFields as any)?.featured_image_prompt || null,
        alt_text: (article.customFields as any)?.featured_image_alt || null,
        filename: (article.customFields as any)?.featured_image_filename || null
      },

      internal_seo: advancedData.internal_seo || {
        internal_links: (article.yoastSeo as any)?.internal_links || [],
        related_keywords: (article.yoastSeo as any)?.related_keywords || [],
        entities: (article.yoastSeo as any)?.entities || []
      },

      user_engagement: advancedData.user_engagement || {
        reading_time: (article.customFields as any)?.reading_time || null,
        cta: (article.customFields as any)?.cta || null,
        key_takeaways: (article.customFields as any)?.key_takeaways || []
      },

      // Metadata
      metadata: {
        structure_version: (article.customFields as any)?.structure_version || 'legacy',
        has_advanced_data: !!(advancedData.basic_data || advancedData.seo_critical),
        data_completeness: {
          basic_data: !!advancedData.basic_data,
          seo_critical: !!advancedData.seo_critical,
          featured_image: !!advancedData.featured_image,
          internal_seo: !!advancedData.internal_seo,
          user_engagement: !!advancedData.user_engagement
        },
        extracted_at: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: structuredData
    });

  } catch (error) {
    console.error('Error fetching article advanced data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}