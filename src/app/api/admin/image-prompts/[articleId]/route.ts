import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/image-prompts/[articleId]
 * Visualizza il prompt DALL-E utilizzato per generare l'immagine di un articolo specifico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { articleId: string } }
) {
  try {
    const { articleId } = params;

    // Trova l'articolo per avere il titolo
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Trova tutte le featured images per questo articolo (ordinate per data)
    const featuredImages = await prisma.featuredImage.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        aiPrompt: true,
        status: true,
        url: true,
        filename: true,
        altText: true,
        createdAt: true,
        updatedAt: true,
        wordpressMediaId: true,
        wordpressUrl: true,
        errorMessage: true
      }
    });

    const promptAnalysis = featuredImages.map((image, index) => {
      // Analizza il prompt per identificare il tipo
      const prompt = image.aiPrompt || '';
      let promptType = 'unknown';
      let estimatedQuality = 'medium';

      // Identifica il tipo di prompt
      if (prompt.includes('createDallePrompt') || prompt.includes('Create a professional, high-quality featured image')) {
        promptType = 'basic-template';
        estimatedQuality = 'low';
      } else if (prompt.includes('professional photography') && prompt.includes('Technical specifications')) {
        promptType = 'advanced-template';
        estimatedQuality = 'high';
      } else if (prompt.includes('mafia') || prompt.includes('vittime') || prompt.includes('legalità')) {
        promptType = 'category-specific';
        estimatedQuality = 'medium-high';
      } else if (prompt.includes('tecnologia') || prompt.includes('politica')) {
        promptType = 'category-specific';
        estimatedQuality = 'medium-high';
      } else if (prompt.length > 500) {
        promptType = 'detailed-custom';
        estimatedQuality = 'high';
      } else if (prompt.length > 200) {
        promptType = 'standard-custom';
        estimatedQuality = 'medium';
      } else {
        promptType = 'basic-custom';
        estimatedQuality = 'low';
      }

      return {
        imageIndex: index + 1,
        imageId: image.id,
        status: image.status,
        hasUrl: !!image.url,
        isUploadedToWordPress: !!image.wordpressMediaId,
        createdAt: image.createdAt,
        prompt: {
          text: prompt,
          length: prompt.length,
          type: promptType,
          estimatedQuality,
          words: prompt.split(' ').length,
          lines: prompt.split('\n').length
        },
        metadata: {
          filename: image.filename,
          altText: image.altText,
          wordpressMediaId: image.wordpressMediaId,
          errorMessage: image.errorMessage
        }
      };
    });

    // Statistiche generali
    const stats = {
      totalImages: featuredImages.length,
      averagePromptLength: Math.round(
        featuredImages.reduce((sum, img) => sum + (img.aiPrompt?.length || 0), 0) / featuredImages.length
      ),
      promptTypes: [...new Set(promptAnalysis.map(p => p.prompt.type))],
      qualityDistribution: promptAnalysis.reduce((acc, p) => {
        acc[p.prompt.estimatedQuality] = (acc[p.prompt.estimatedQuality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        createdAt: article.createdAt
      },
      prompts: promptAnalysis,
      statistics: stats,
      recommendations: generateRecommendations(promptAnalysis)
    });

  } catch (error) {
    console.error('❌ Error fetching image prompts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch image prompts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Genera raccomandazioni per migliorare i prompt
 */
function generateRecommendations(promptAnalysis: any[]): string[] {
  const recommendations: string[] = [];

  const latestPrompt = promptAnalysis[0];
  if (!latestPrompt) {
    return ['No prompts found for this article'];
  }

  const prompt = latestPrompt.prompt;

  // Analizza la qualità del prompt attuale
  if (prompt.length < 100) {
    recommendations.push('🔴 Prompt troppo corto - Considera di aggiungere più dettagli specifici');
  }

  if (prompt.type === 'basic-template') {
    recommendations.push('🟡 Prompt generico - Considera di usare un template specifico per categoria');
  }

  if (!prompt.text.includes('style') && !prompt.text.includes('Style')) {
    recommendations.push('🟡 Manca specifica di stile - Aggiungi dettagli sullo stile fotografico desiderato');
  }

  if (!prompt.text.includes('lighting') && !prompt.text.includes('light')) {
    recommendations.push('🟡 Manca specifica illuminazione - Aggiungi dettagli su illuminazione e mood');
  }

  if (!prompt.text.includes('color') && !prompt.text.includes('colore')) {
    recommendations.push('🟡 Manca palette colori - Specifica i colori dominanti desiderati');
  }

  if (!prompt.text.toLowerCase().includes('italian') && !prompt.text.toLowerCase().includes('italia')) {
    recommendations.push('🟡 Manca contesto italiano - Considera di aggiungere elementi culturali italiani');
  }

  if (prompt.text.includes('high quality') || prompt.text.includes('professional')) {
    recommendations.push('✅ Buono - Include specifiche di qualità');
  }

  if (prompt.length > 300 && prompt.type !== 'basic-template') {
    recommendations.push('✅ Buono - Prompt dettagliato e specifico');
  }

  if (prompt.estimatedQuality === 'high') {
    recommendations.push('✅ Ottimo - Prompt di alta qualità con buone specifiche tecniche');
  }

  // Raccomandazioni generali
  if (recommendations.filter(r => r.startsWith('🔴')).length === 0 &&
      recommendations.filter(r => r.startsWith('🟡')).length === 0) {
    recommendations.push('🎉 Prompt di buona qualità - Continua così!');
  }

  return recommendations;
}