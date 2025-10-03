import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/generation-settings
 * Retrieves user's generation settings
 */
export async function GET(request: NextRequest) {

  try {
    // Get user ID from session/auth (simplified for demo)
    const userId = request.headers.get('x-user-id') || 'demo-user';

    // Check if settings exist for user
    let settings = await prisma.generationSettings.findUnique({
      where: { userId }
    });

    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.generationSettings.create({
        data: {
          userId,
          titlePrompt: 'che sia accattivante, SEO-friendly, chiaro e informativo.',
          contentPrompt: 'che sia completo, ben strutturato, originale e coinvolgente. Usa paragrafi chiari, evita strutture troppo rigide e non inserire i nomi "introduzione" e "conclusione". Tra un h2 e l\'altro inserisci almeno 500 parole.',
          imagePrompt: 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.'
        }
      });
    }

    // Get WordPress automation settings
    const wordpressSites = await prisma.wordPressSite.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        url: true,
        enableAutoGeneration: true,
        enableFeaturedImage: true,
        enableAutoPublish: true,
        isActive: true
      }
    });

    // Format response
    const responseData = {
      settings: {
        prompts: {
          titlePrompt: settings.titlePrompt,
          contentPrompt: settings.contentPrompt,
          imagePrompt: settings.imagePrompt || 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.'
        },
        modelSettings: {
          model: settings.defaultModel,
          temperature: settings.defaultTemperature,
          maxTokens: settings.defaultMaxTokens
        },
        languageSettings: {
          language: settings.defaultLanguage,
          tone: settings.defaultTone,
          style: settings.defaultStyle,
          targetAudience: settings.defaultTargetAudience
        }
      },
      wordpressSites,
      isDefault: !settings.updatedAt || settings.createdAt === settings.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Generation settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/generation-settings
 * Updates user's generation settings
 */
export async function PUT(request: NextRequest) {

  try {
    // Get user ID from session/auth (simplified for demo)
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const body = await request.json();

    // Update or create settings
    const settings = await prisma.generationSettings.upsert({
      where: { userId },
      update: {
        titlePrompt: body.titlePrompt || undefined,
        contentPrompt: body.contentPrompt || undefined,
        imagePrompt: body.imagePrompt || undefined,
        imageStyle: body.imageStyle || undefined,
        defaultModel: body.modelSettings?.model || undefined,
        defaultTemperature: body.modelSettings?.temperature || undefined,
        defaultMaxTokens: body.modelSettings?.maxTokens || undefined,
        defaultLanguage: body.languageSettings?.language || undefined,
        defaultTone: body.languageSettings?.tone || undefined,
        defaultStyle: body.languageSettings?.style || undefined,
        defaultTargetAudience: body.languageSettings?.targetAudience || undefined
      },
      create: {
        userId,
        titlePrompt: body.titlePrompt || 'che sia accattivante, SEO-friendly, chiaro e informativo.',
        contentPrompt: body.contentPrompt || 'che sia completo, ben strutturato, originale e coinvolgente. Usa paragrafi chiari, evita strutture troppo rigide e non inserire i nomi "introduzione" e "conclusione". Tra un h2 e l\'altro inserisci almeno 500 parole.',
        imagePrompt: body.imagePrompt || 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.',
        imageStyle: body.imageStyle || 'natural',
        defaultModel: body.modelSettings?.model || 'gpt-4',
        defaultTemperature: body.modelSettings?.temperature || 0.7,
        defaultMaxTokens: body.modelSettings?.maxTokens || 20000,
        defaultLanguage: body.languageSettings?.language || 'it',
        defaultTone: body.languageSettings?.tone || 'professionale',
        defaultStyle: body.languageSettings?.style || 'giornalistico',
        defaultTargetAudience: body.languageSettings?.targetAudience || 'generale'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          prompts: {
            titlePrompt: settings.titlePrompt,
            contentPrompt: settings.contentPrompt,
            imagePrompt: settings.imagePrompt
          },
          imageStyle: settings.imageStyle,
          modelSettings: {
            model: settings.defaultModel,
            temperature: settings.defaultTemperature,
            maxTokens: settings.defaultMaxTokens
          },
          languageSettings: {
            language: settings.defaultLanguage,
            tone: settings.defaultTone,
            style: settings.defaultStyle,
            targetAudience: settings.defaultTargetAudience
          }
        }
      }
    });

  } catch (error) {
    console.error('Generation settings update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}