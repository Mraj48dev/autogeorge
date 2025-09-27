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
          titlePrompt: 'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.',
          contentPrompt: 'Scrivi un articolo completo e ben strutturato basato su questo contenuto. L\'articolo deve essere originale, coinvolgente e ben formattato con paragrafi chiari.',
          seoPrompt: 'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.',
          imagePrompt: 'Genera un\'immagine in evidenza per questo articolo che sia visivamente accattivante e pertinente al contenuto'
        }
      });
    }

    // Format response
    const responseData = {
      settings: {
        prompts: {
          titlePrompt: settings.titlePrompt,
          contentPrompt: settings.contentPrompt,
          seoPrompt: settings.seoPrompt,
          imagePrompt: settings.imagePrompt || 'Genera un\'immagine in evidenza per questo articolo'
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
        seoPrompt: body.seoPrompt || undefined,
        imagePrompt: body.imagePrompt || undefined,
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
        titlePrompt: body.titlePrompt || 'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.',
        contentPrompt: body.contentPrompt || 'Scrivi un articolo completo e ben strutturato basato su questo contenuto. L\'articolo deve essere originale, coinvolgente e ben formattato con paragrafi chiari.',
        seoPrompt: body.seoPrompt || 'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.',
        imagePrompt: body.imagePrompt || 'Genera un\'immagine in evidenza per questo articolo che sia visivamente accattivante e pertinente al contenuto',
        defaultModel: body.modelSettings?.model || 'gpt-4',
        defaultTemperature: body.modelSettings?.temperature || 0.7,
        defaultMaxTokens: body.modelSettings?.maxTokens || 2000,
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
            seoPrompt: settings.seoPrompt,
            imagePrompt: settings.imagePrompt
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