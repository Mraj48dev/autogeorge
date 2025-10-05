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
          imagePrompt: 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.',  // ✅ AGGIUNTO: Default imagePrompt
          imageStyle: 'natural',  // ✅ AGGIUNTO: Default imageStyle
          imageModel: 'dall-e-3',  // ✅ AGGIUNTO: Default imageModel
          imageSize: '1792x1024',   // ✅ AGGIUNTO: Default imageSize
          // ✅ AGGIUNTO: Default per nuovi campi prompt engineering
          imageGenerationMode: 'manual',
          enablePromptEngineering: false,
          promptTemplate: 'Analizza questo articolo e genera un prompt per DALL-E che sia ottimizzato per evitare contenuto che viola le policy. Il prompt deve descrivere un\'immagine che rappresenti il tema dell\'articolo in modo creativo e sicuro:\n\nTitolo: {title}\nContenuto: {article}',
          allowPromptEditing: true,
          promptEngineeringModel: 'gpt-4'
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
          imagePrompt: settings.imagePrompt  // ✅ AGGIUNTO: Includi imagePrompt nella risposta
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
        },
        imageSettings: {
          defaultModel: settings.imageModel,  // ✅ AGGIUNTO: Includi imageModel nella risposta
          defaultStyle: settings.imageStyle,  // ✅ AGGIUNTO: Includi imageStyle nella risposta
          defaultSize: settings.imageSize     // ✅ AGGIUNTO: Includi imageSize nella risposta
        },
        // ✅ AGGIUNTO: Nuovi campi prompt engineering
        imageGenerationMode: settings.imageGenerationMode,
        enablePromptEngineering: settings.enablePromptEngineering,
        promptTemplate: settings.promptTemplate,
        allowPromptEditing: settings.allowPromptEditing,
        promptEngineeringModel: settings.promptEngineeringModel
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
        imagePrompt: body.imagePrompt || undefined,  // ✅ AGGIUNTO: Salva imagePrompt
        imageStyle: body.imageSettings?.defaultStyle || undefined,  // ✅ AGGIUNTO: Salva imageStyle
        imageModel: body.imageSettings?.defaultModel || undefined,  // ✅ AGGIUNTO: Salva imageModel
        imageSize: body.imageSettings?.defaultSize || undefined,    // ✅ AGGIUNTO: Salva imageSize
        defaultModel: body.modelSettings?.model || undefined,
        defaultTemperature: body.modelSettings?.temperature || undefined,
        defaultMaxTokens: body.modelSettings?.maxTokens || undefined,
        defaultLanguage: body.languageSettings?.language || undefined,
        defaultTone: body.languageSettings?.tone || undefined,
        defaultStyle: body.languageSettings?.style || undefined,
        defaultTargetAudience: body.languageSettings?.targetAudience || undefined,
        // ✅ AGGIUNTO: Salva nuovi campi prompt engineering
        imageGenerationMode: body.imageGenerationMode || undefined,
        enablePromptEngineering: body.enablePromptEngineering !== undefined ? body.enablePromptEngineering : undefined,
        promptTemplate: body.promptTemplate || undefined,
        allowPromptEditing: body.allowPromptEditing !== undefined ? body.allowPromptEditing : undefined,
        promptEngineeringModel: body.promptEngineeringModel || undefined
      },
      create: {
        userId,
        titlePrompt: body.titlePrompt || 'che sia accattivante, SEO-friendly, chiaro e informativo.',
        contentPrompt: body.contentPrompt || 'che sia completo, ben strutturato, originale e coinvolgente. Usa paragrafi chiari, evita strutture troppo rigide e non inserire i nomi "introduzione" e "conclusione". Tra un h2 e l\'altro inserisci almeno 500 parole.',
        imagePrompt: body.imagePrompt || 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.',  // ✅ AGGIUNTO: Crea con imagePrompt
        imageStyle: body.imageSettings?.defaultStyle || 'natural',  // ✅ AGGIUNTO: Crea con imageStyle
        imageModel: body.imageSettings?.defaultModel || 'dall-e-3',  // ✅ AGGIUNTO: Crea con imageModel
        imageSize: body.imageSettings?.defaultSize || '1792x1024',   // ✅ AGGIUNTO: Crea con imageSize
        defaultModel: body.modelSettings?.model || 'gpt-4',
        defaultTemperature: body.modelSettings?.temperature || 0.7,
        defaultMaxTokens: body.modelSettings?.maxTokens || 20000,
        defaultLanguage: body.languageSettings?.language || 'it',
        defaultTone: body.languageSettings?.tone || 'professionale',
        defaultStyle: body.languageSettings?.style || 'giornalistico',
        defaultTargetAudience: body.languageSettings?.targetAudience || 'generale',
        // ✅ AGGIUNTO: Crea con nuovi campi prompt engineering
        imageGenerationMode: body.imageGenerationMode || 'manual',
        enablePromptEngineering: body.enablePromptEngineering ?? false,
        promptTemplate: body.promptTemplate || 'Analizza questo articolo e genera un prompt per DALL-E che sia ottimizzato per evitare contenuto che viola le policy. Il prompt deve descrivere un\'immagine che rappresenti il tema dell\'articolo in modo creativo e sicuro:\n\nTitolo: {title}\nContenuto: {article}',
        allowPromptEditing: body.allowPromptEditing ?? true,
        promptEngineeringModel: body.promptEngineeringModel || 'gpt-4'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          prompts: {
            titlePrompt: settings.titlePrompt,
            contentPrompt: settings.contentPrompt,
            imagePrompt: settings.imagePrompt  // ✅ AGGIUNTO: Includi imagePrompt nella risposta PUT
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
          },
          imageSettings: {
            defaultModel: settings.imageModel,  // ✅ AGGIUNTO: Includi imageModel nella risposta PUT
            defaultStyle: settings.imageStyle,  // ✅ AGGIUNTO: Includi imageStyle nella risposta PUT
            defaultSize: settings.imageSize     // ✅ AGGIUNTO: Includi imageSize nella risposta PUT
          },
          // ✅ AGGIUNTO: Nuovi campi prompt engineering nella risposta PUT
          imageGenerationMode: settings.imageGenerationMode,
          enablePromptEngineering: settings.enablePromptEngineering,
          promptTemplate: settings.promptTemplate,
          allowPromptEditing: settings.allowPromptEditing,
          promptEngineeringModel: settings.promptEngineeringModel
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