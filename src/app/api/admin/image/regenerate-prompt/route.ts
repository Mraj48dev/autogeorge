import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/image/regenerate-prompt
 * Forza la rigenerazione del prompt ChatGPT per un articolo
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Missing articleId'
      }, { status: 400 });
    }

    // Elimina i prompt esistenti per questo articolo
    const deletedCount = await prisma.imagePrompt.deleteMany({
      where: { articleId: articleId }
    });

    console.log(`🗑️ [Regenerate] Deleted ${deletedCount.count} existing prompts for article ${articleId}`);

    return NextResponse.json({
      success: true,
      data: {
        articleId: articleId,
        deletedPrompts: deletedCount.count,
        message: 'Prompt cache cleared. Next image generation will create a new ChatGPT prompt.'
      }
    });

  } catch (error) {
    console.error('❌ [Regenerate] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}