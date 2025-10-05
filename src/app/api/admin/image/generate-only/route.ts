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
 * Generate AI-optimized prompt using ChatGPT
 */
async function generatePromptWithChatGPT(
  title: string,
  content: string,
  template: string,
  model: string,
  openaiApiKey: string
): Promise<string> {
  try {
    // Replace placeholders in template
    const processedTemplate = template
      .replace(/{title}/g, title)
      .replace(/{article}/g, content.substring(0, 500)); // Limit content length

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating DALL-E prompts that avoid content policy violations while being creative and descriptive.'
          },
          {
            role: 'user',
            content: processedTemplate
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`ChatGPT API failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      throw new Error('ChatGPT did not return a valid prompt');
    }

    console.log('✅ [Prompt Engineering] ChatGPT generated prompt:', generatedPrompt);
    return generatedPrompt;

  } catch (error) {
    console.error('❌ [Prompt Engineering] Failed to generate prompt with ChatGPT:', error);
    throw error;
  }
}

/**
 * Create manual prompt with placeholders replaced
 */
function createManualPrompt(title: string, content: string, template: string): string {
  return template
    .replace(/{title}/g, title)
    .replace(/{article}/g, content.substring(0, 500));
}

/**
 * Legacy fallback prompt (kept for compatibility)
 */
function createLegacyPrompt(title: string, content: string): string {
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

    // Get user settings for image generation
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const userSettings = await prisma.generationSettings.findUnique({
      where: { userId },
      select: {
        imageStyle: true,
        imageGenerationMode: true,
        promptTemplate: true,
        promptEngineeringModel: true,
        imagePrompt: true
      }
    });

    const imageStyle = userSettings?.imageStyle || 'natural';
    const imageGenerationMode = userSettings?.imageGenerationMode || 'manual';

    // Generate image directly with DALL-E
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ [AI Generation] OpenAI API key not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Determine which prompt to use based on settings
    let dallePrompt: string;
    let promptSource: string;

    if (imageGenerationMode === 'full_auto') {
      // Mode: Full Auto with ChatGPT prompt engineering
      try {
        // Prima controlla se esiste già un prompt salvato per questo articolo
        const existingPrompt = await prisma.imagePrompt.findFirst({
          where: {
            articleId: articleId,
            status: 'generated'
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingPrompt) {
          // Riusa il prompt esistente per evitare di bruciare token
          dallePrompt = existingPrompt.generatedPrompt;
          promptSource = 'cached-chatgpt';
          console.log('💾 [Full Auto] Using cached ChatGPT prompt to save tokens');
        } else {
          // Genera nuovo prompt con ChatGPT
          const template = userSettings?.promptTemplate || 'Analizza questo articolo e genera un prompt per DALL-E che sia ottimizzato per evitare contenuto che viola le policy. Il prompt deve descrivere un\'immagine che rappresenti il tema dell\'articolo in modo creativo e sicuro:\n\nTitolo: {title}\nContenuto: {article}';
          const model = userSettings?.promptEngineeringModel || 'gpt-4';

          dallePrompt = await generatePromptWithChatGPT(
            articleTitle,
            articleContent,
            template,
            model,
            openaiApiKey
          );

          // Salva il prompt generato nel database per riutilizzo futuro
          await prisma.imagePrompt.create({
            data: {
              id: `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              articleId: articleId,
              articleTitle: articleTitle,
              articleExcerpt: articleContent.substring(0, 200),
              generatedPrompt: dallePrompt,
              originalTemplate: template,
              aiModel: model,
              status: 'generated',
              metadata: JSON.stringify({
                generatedAt: new Date().toISOString(),
                source: 'chatgpt-api',
                userId: userId
              })
            }
          });

          promptSource = 'chatgpt-generated';
          console.log('🤖 [Full Auto] Generated NEW ChatGPT prompt and saved to DB');
        }
      } catch (error) {
        console.warn('⚠️ [Full Auto] ChatGPT failed, falling back to legacy prompt:', error);
        dallePrompt = createLegacyPrompt(articleTitle, articleContent);
        promptSource = 'legacy-fallback';
      }
    } else if (imageGenerationMode === 'manual' && userSettings?.imagePrompt) {
      // Mode: Manual with user-defined template
      dallePrompt = createManualPrompt(articleTitle, articleContent, userSettings.imagePrompt);
      promptSource = 'manual-template';
      console.log('✏️ [Manual] Using user-defined prompt template');
    } else {
      // Fallback: Legacy hardcoded logic
      dallePrompt = createLegacyPrompt(articleTitle, articleContent);
      promptSource = 'legacy-fallback';
      console.log('🔄 [Fallback] Using legacy prompt logic');
    }

    console.log('🎨 [Image Generation] Final prompt:', dallePrompt);
    console.log('🎨 [Image Generation] Prompt source:', promptSource);
    console.log('🎨 [Image Generation] Using style:', imageStyle);

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
        style: imageStyle,
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
        keywords: [],
        promptSource: promptSource,
        usedPrompt: dallePrompt,
        imageGenerationMode: imageGenerationMode
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