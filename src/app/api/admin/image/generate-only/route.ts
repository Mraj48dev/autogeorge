import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface GenerateOnlyRequest {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  aiPrompt: string;
  filename: string;
  altText: string;
}

/**
 * Create optimized DALL-E prompt based on article content
 */
function createDallePrompt(title: string, content: string): string {
  const titleLower = title.toLowerCase();

  // Detect topic and create appropriate prompt
  if (titleLower.includes('mafia') || titleLower.includes('vittime') || titleLower.includes('legalità')) {
    return `A professional, respectful image representing justice and law enforcement in Italy.
    Show scales of justice, courthouse architecture, or Italian institutional buildings.
    Professional photography style, serious tone, symbolic representation of law and order.
    Avoid any criminal imagery or violence. Focus on dignity, justice, and institutional authority.`;
  }

  if (titleLower.includes('tecnologia') || titleLower.includes('ai') || titleLower.includes('digitale')) {
    return `A modern, professional technology concept image. Clean design with computers,
    digital interfaces, or abstract technological elements. Minimalist style, blue and white colors,
    representing innovation and progress. High-quality professional photography.`;
  }

  if (titleLower.includes('politica') || titleLower.includes('governo') || titleLower.includes('elezioni')) {
    return `A professional image representing government and political institutions.
    Show Italian government buildings, flags, or formal political settings.
    Dignified, institutional style with official architecture or ceremonial elements.`;
  }

  // Generic professional prompt based on content
  const contentWords = content.split(' ').slice(0, 20).join(' ');
  return `A professional, high-quality image representing: ${title}.
  Style: professional photography, clean composition, modern aesthetic,
  appropriate for news or editorial use. Avoid generic stock photo appearance.
  Context: ${contentWords}`;
}

/**
 * POST /api/admin/image/generate-only
 * Generate images with AI without web search
 * Used when only the "crea immagine con AI" flag is enabled
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody: GenerateOnlyRequest = await request.json();
    const { articleId, articleTitle, articleContent, aiPrompt, filename, altText } = requestBody;

    console.log('🎨 [AI Only] Starting image generation for article:', articleId);

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true }
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Generate image directly with DALL-E
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ [AI Generation] OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create DALL-E optimized prompt
    const dallePrompt = createDallePrompt(articleTitle, articleContent);
    console.log('🎨 [AI Generation] Generated prompt:', dallePrompt);

    // Call OpenAI DALL-E API for image generation
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      }),
    });

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.json();
      console.error('❌ [AI Generation] DALL-E failed:', errorData);
      return NextResponse.json(
        { success: false, error: `DALL-E generation failed: ${errorData.error?.message || dalleResponse.status}` },
        { status: 500 }
      );
    }

    const dalleData = await dalleResponse.json();
    const imageUrl = dalleData.data?.[0]?.url;

    if (!imageUrl) {
      console.error('❌ [AI Generation] No image URL in DALL-E response');
      return NextResponse.json(
        { success: false, error: 'DALL-E did not return an image URL' },
        { status: 500 }
      );
    }

    // Create response in expected format
    const imageData = {
      image: {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        articleId: articleId,
        url: imageUrl,
        filename: filename,
        altText: altText,
        status: 'found',
        relevanceScore: 95,
        searchLevel: 'ai-generated'
      },
      searchResults: {
        totalFound: 1,
        candidatesEvaluated: 1,
        bestScore: 95,
        searchLevel: 'ai-generated',
        processingTime: Date.now()
      },
      metadata: {
        wasGenerated: true,
        provider: 'openai-dall-e-3',
        searchTime: Date.now(),
        totalTime: Date.now(),
        keywords: []
      }
    };

    console.log('✅ [AI Only] Generated image successfully');

    return NextResponse.json({
      success: true,
      data: {
        ...imageData,
        searchLevel: 'ai-only',
        method: 'ai-generation'
      }
    });

  } catch (error) {
    console.error('❌ [AI Only] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}