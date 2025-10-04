import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/debug/test-image-flow
 * Test endpoint per verificare il nuovo flusso di generazione immagini
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n🧪 [DEBUG] Testing new simplified image generation flow...');

    // STEP 1: Trova un articolo esistente che potremmo usare per test
    const existingArticle = await prisma.article.findFirst({
      where: {
        status: {
          in: ['generated', 'generated_with_image']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!existingArticle) {
      return NextResponse.json({
        success: false,
        error: 'No suitable article found for testing'
      });
    }

    console.log(`🎯 [DEBUG] Using article for test: ${existingArticle.id} - "${existingArticle.title}"`);

    // STEP 2: Crea un articolo di test in status generated_image_draft
    const testArticle = await prisma.article.create({
      data: {
        title: `[TEST] ${existingArticle.title}`,
        content: existingArticle.content,
        status: 'generated_image_draft',
        sourceId: existingArticle.sourceId,
        sourceType: 'test',
        aiModel: 'test-model',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ [DEBUG] Test article created: ${testArticle.id} with status: ${testArticle.status}`);

    // STEP 3: Trigger auto-image cron manualmente
    console.log(`🚀 [DEBUG] Triggering auto-image cron...`);

    const cronResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://autogeorge.vercel.app'}/api/cron/auto-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const cronResult = await cronResponse.json();
    console.log(`📊 [DEBUG] Cron result:`, cronResult);

    // STEP 4: Verifica lo status finale dell'articolo
    const updatedArticle = await prisma.article.findUnique({
      where: { id: testArticle.id },
      select: {
        id: true,
        title: true,
        status: true,
        featuredMediaUrl: true,
        updatedAt: true
      }
    });

    console.log(`🔍 [DEBUG] Final article status:`, {
      id: updatedArticle?.id,
      status: updatedArticle?.status,
      hasFeaturedImage: !!updatedArticle?.featuredMediaUrl,
      updatedAt: updatedArticle?.updatedAt
    });

    // STEP 5: Verifica le immagini generate
    const featuredImages = await prisma.featuredImage.findMany({
      where: { articleId: testArticle.id },
      select: {
        id: true,
        status: true,
        url: true,
        aiPrompt: true,
        createdAt: true
      }
    });

    console.log(`🖼️ [DEBUG] Featured images:`, featuredImages);

    // STEP 6: Cleanup - rimuovi l'articolo di test
    await prisma.featuredImage.deleteMany({
      where: { articleId: testArticle.id }
    });

    await prisma.article.delete({
      where: { id: testArticle.id }
    });

    console.log(`🧹 [DEBUG] Test cleanup completed`);

    return NextResponse.json({
      success: true,
      testResults: {
        originalArticle: {
          id: existingArticle.id,
          title: existingArticle.title
        },
        testArticle: {
          id: testArticle.id,
          initialStatus: 'generated_image_draft',
          finalStatus: updatedArticle?.status,
          hasFeaturedImage: !!updatedArticle?.featuredMediaUrl
        },
        cronExecution: cronResult,
        featuredImages: featuredImages,
        workflow: {
          started: 'generated_image_draft',
          processed: cronResult?.results?.processed > 0,
          completed: updatedArticle?.status !== 'generated_image_draft',
          nextStep: updatedArticle?.status === 'ready_to_publish' ? 'Auto-publishing' : 'Manual publishing'
        }
      },
      message: `Test completed: Article ${testArticle.id} processed from generated_image_draft to ${updatedArticle?.status}`
    });

  } catch (error) {
    console.error('💥 [DEBUG] Test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Image generation flow test failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/debug/test-image-flow
 * Info about the test endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/debug/test-image-flow',
    description: 'Test endpoint for the new simplified image generation flow',
    usage: 'POST to run the test',
    workflow: [
      '1. Creates test article in generated_image_draft status',
      '2. Triggers auto-image cron',
      '3. Verifies image generation and status update',
      '4. Cleans up test data',
      '5. Returns test results'
    ],
    expectedFlow: 'generated_image_draft → AI generation → generated_with_image/ready_to_publish'
  });
}