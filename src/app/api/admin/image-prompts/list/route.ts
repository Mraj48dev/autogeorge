import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/image-prompts/list
 * Lista di tutti i prompt DALL-E utilizzati con analisi e statistiche
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'all';

    // Query per ottenere articoli con le loro featured images
    const whereClause = status !== 'all' ? { status } : {};

    const articlesWithImages = await prisma.article.findMany({
      where: whereClause,
      include: {
        featuredImages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Solo l'immagine più recente per articolo
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    // Filtra solo articoli che hanno immagini
    const articlesWithPrompts = articlesWithImages.filter(
      article => article.featuredImages.length > 0
    );

    const promptsAnalysis = articlesWithPrompts.map(article => {
      const featuredImage = article.featuredImages[0];
      const prompt = featuredImage.aiPrompt || '';

      // Analisi del prompt
      let promptType = 'unknown';
      let estimatedQuality = 'medium';
      let category = 'general';

      // Identifica il tipo di prompt
      if (prompt.includes('Create a professional, high-quality featured image')) {
        promptType = 'auto-cron-template';
        estimatedQuality = 'low';
      } else if (prompt.includes('mafia') || prompt.includes('vittime') || prompt.includes('legalità')) {
        promptType = 'category-specific';
        category = 'cronaca/legalità';
        estimatedQuality = 'medium-high';
      } else if (prompt.includes('tecnologia') || prompt.includes('digitale') || prompt.includes('ai')) {
        promptType = 'category-specific';
        category = 'tecnologia';
        estimatedQuality = 'medium-high';
      } else if (prompt.includes('politica') || prompt.includes('governo')) {
        promptType = 'category-specific';
        category = 'politica';
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

      // Estrai features del prompt
      const features = {
        hasStyleSpecs: prompt.toLowerCase().includes('style') || prompt.toLowerCase().includes('stile'),
        hasLightingSpecs: prompt.toLowerCase().includes('lighting') || prompt.toLowerCase().includes('light'),
        hasColorSpecs: prompt.toLowerCase().includes('color') || prompt.toLowerCase().includes('colore'),
        hasQualitySpecs: prompt.toLowerCase().includes('high quality') || prompt.toLowerCase().includes('professional'),
        hasItalianContext: prompt.toLowerCase().includes('italian') || prompt.toLowerCase().includes('italia'),
        hasNegativePrompts: prompt.toLowerCase().includes('avoid') || prompt.toLowerCase().includes('not'),
        hasTechnicalSpecs: prompt.toLowerCase().includes('technical') || prompt.toLowerCase().includes('specification')
      };

      const qualityScore = Object.values(features).filter(Boolean).length;

      return {
        article: {
          id: article.id,
          title: article.title,
          status: article.status,
          createdAt: article.createdAt
        },
        image: {
          id: featuredImage.id,
          status: featuredImage.status,
          hasUrl: !!featuredImage.url,
          isUploadedToWordPress: !!featuredImage.wordpressMediaId,
          createdAt: featuredImage.createdAt
        },
        prompt: {
          text: prompt,
          preview: prompt.substring(0, 150) + (prompt.length > 150 ? '...' : ''),
          length: prompt.length,
          words: prompt.split(' ').length,
          lines: prompt.split('\n').length,
          type: promptType,
          category,
          estimatedQuality,
          qualityScore,
          features
        }
      };
    });

    // Statistiche generali
    const stats = {
      totalArticlesWithImages: promptsAnalysis.length,
      averagePromptLength: Math.round(
        promptsAnalysis.reduce((sum, item) => sum + item.prompt.length, 0) / promptsAnalysis.length
      ),
      promptTypes: promptsAnalysis.reduce((acc, item) => {
        acc[item.prompt.type] = (acc[item.prompt.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      qualityDistribution: promptsAnalysis.reduce((acc, item) => {
        acc[item.prompt.estimatedQuality] = (acc[item.prompt.estimatedQuality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      categoryDistribution: promptsAnalysis.reduce((acc, item) => {
        acc[item.prompt.category] = (acc[item.prompt.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageQualityScore: Math.round(
        promptsAnalysis.reduce((sum, item) => sum + item.prompt.qualityScore, 0) / promptsAnalysis.length * 10
      ) / 10
    };

    // Raccomandazioni generali
    const recommendations = generateGeneralRecommendations(stats, promptsAnalysis);

    return NextResponse.json({
      success: true,
      data: promptsAnalysis,
      statistics: stats,
      recommendations,
      pagination: {
        offset,
        limit,
        total: promptsAnalysis.length,
        hasMore: promptsAnalysis.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching image prompts list:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch image prompts list',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Genera raccomandazioni generali per il sistema
 */
function generateGeneralRecommendations(stats: any, prompts: any[]): string[] {
  const recommendations: string[] = [];

  // Analisi lunghezza prompt
  if (stats.averagePromptLength < 150) {
    recommendations.push('🔴 Prompt mediamente troppo corti - Considera di usare template più dettagliati');
  } else if (stats.averagePromptLength > 400) {
    recommendations.push('✅ Buona lunghezza media dei prompt');
  }

  // Analisi tipi di prompt
  const autoCronPercentage = (stats.promptTypes['auto-cron-template'] || 0) / prompts.length * 100;
  if (autoCronPercentage > 70) {
    recommendations.push('🟡 Troppi prompt generici auto-generati - Considera di migliorare il template CRON');
  }

  // Analisi qualità
  const highQualityPercentage = (stats.qualityDistribution['high'] || 0) / prompts.length * 100;
  if (highQualityPercentage < 30) {
    recommendations.push('🟡 Pochi prompt di alta qualità - Considera di implementare il sistema avanzato di prompting');
  }

  // Analisi punteggio qualità
  if (stats.averageQualityScore < 3) {
    recommendations.push('🔴 Punteggio qualità basso - I prompt mancano di specifiche tecniche');
  } else if (stats.averageQualityScore > 5) {
    recommendations.push('✅ Buon punteggio qualità medio dei prompt');
  }

  // Analisi categorizzazione
  const generalCategoryPercentage = (stats.categoryDistribution['general'] || 0) / prompts.length * 100;
  if (generalCategoryPercentage > 80) {
    recommendations.push('🟡 Troppi prompt generici - Implementa categorizzazione automatica');
  }

  // Raccomandazioni positive
  if (recommendations.filter(r => r.startsWith('✅')).length > 0) {
    recommendations.push('🎯 Sistema in buono stato - Continua con ottimizzazioni graduali');
  }

  if (recommendations.length === 0) {
    recommendations.push('🎉 Sistema prompt in ottimo stato!');
  }

  return recommendations;
}