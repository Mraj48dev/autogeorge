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

    // Call the enhanced search endpoint with AI-only mode
    const generateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://autogeorge.vercel.app'}/api/admin/image/search-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articleId,
        articleTitle,
        articleContent,
        aiPrompt,
        filename,
        altText,
        aiOnly: true // Force AI-only mode
      })
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      console.error('❌ [AI Only] Enhanced generation failed:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Generation failed' },
        { status: generateResponse.status }
      );
    }

    const generateResult = await generateResponse.json();

    if (!generateResult.success) {
      console.error('❌ [AI Only] Enhanced generation returned error:', generateResult.error);
      return NextResponse.json(
        { success: false, error: generateResult.error },
        { status: 400 }
      );
    }

    const imageData = generateResult.data;

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