import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { requireAuth } from '@/lib/auth';
import { OpenAIService } from '@/modules/content/infrastructure/services/OpenAIService';
import { Article } from '@/modules/content/domain/entities/Article';

interface GenerateArticleRequest {
  prompt: string;
  model?: string;
  targetWordCount?: number;
  tone?: string;
  style?: string;
  keywords?: string[];
  sourceId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication and get user context
    const user = await requireAuth(request);
    console.log('✅ User authenticated:', { userId: user.userId, email: user.email });

    const body: GenerateArticleRequest = await request.json();

    // Validate required fields
    if (!body.prompt || body.prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Prompt deve essere di almeno 10 caratteri' },
        { status: 400 }
      );
    }

    // SECURITY: If sourceId is provided, verify ownership
    if (body.sourceId) {
      const source = await prisma.source.findUnique({
        where: { id: body.sourceId },
        select: { userId: true, id: true }
      });

      if (!source) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        );
      }

      if (source.userId !== user.userId) {
        console.warn(`🚨 Security: User ${user.userId} attempted to access source ${body.sourceId} owned by ${source.userId}`);
        return NextResponse.json(
          { error: 'Source not found' }, // Don't reveal that it exists but belongs to another user
          { status: 404 }
        );
      }
    }

    // Get API keys from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.error('Missing OpenAI API key');
      return NextResponse.json(
        { error: 'AI services not configured. Missing API keys.' },
        { status: 500 }
      );
    }

    // Initialize OpenAI service
    const openaiService = new OpenAIService(openaiApiKey);

    const prompt = body.prompt.trim();
    const wordCount = body.targetWordCount || 800;
    const tone = body.tone || 'professionale';
    const style = body.style || 'giornalistico';
    const keywords = body.keywords || [];

    console.log('🚀 Starting AI article generation with OpenAI...');

    // Generate article using OpenAI
    const generationResult = await openaiService.generateArticle({
      prompt: `Scrivi un articolo completo e ben strutturato su: ${prompt}

Requisiti:
- Lunghezza target: circa ${wordCount} parole
- Tono: ${tone}
- Stile: ${style}
- Parole chiave da includere: ${keywords.join(', ')}
- Lingua: italiano
- Formato: HTML semantico ben strutturato con tag <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>

L'articolo deve essere originale, coinvolgente e formattato ESCLUSIVAMENTE in HTML pulito (NO markdown).`,
      targetWordCount: wordCount,
      tone,
      style,
      keywords,
      model: body.model === 'sonar' ? 'gpt-4o-mini' : 'gpt-4o-mini', // Map to valid OpenAI models
      metadata: {
        requestId: `generate-article-${Date.now()}`
      }
    });

    if (generationResult.isFailure()) {
      console.error('❌ Article generation failed:', generationResult.error);
      return NextResponse.json(
        {
          error: 'Errore durante la generazione dell\'articolo',
          details: generationResult.error.message
        },
        { status: 500 }
      );
    }

    const result = generationResult.value;
    console.log('✅ Article generation completed successfully!');

    const title = result.title;
    const content = result.content;

    // 🔧 FIX: Get WordPress automation settings to determine correct initial status
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const wordpressSite = await prisma.wordPressSite.findUnique({
      where: { userId }
    });

    const automationSettings = {
      enableFeaturedImage: wordpressSite?.enableFeaturedImage || false,
      enableAutoPublish: wordpressSite?.enableAutoPublish || false
    };

    // 🔧 FIX: Determine correct initial status based on automation settings
    const initialStatus = Article.determineInitialStatus(automationSettings);

    console.log('🎯 [Generate-Article Fix] Article initial status determined:', {
      status: initialStatus.getValue(),
      automationSettings,
      enableAutoGeneration: wordpressSite?.enableAutoGeneration || false
    });

    // Create the article in database with CORRECT status
    const article = await prisma.article.create({
      data: {
        title,
        content,
        status: initialStatus.getValue(), // 🔧 FIX: Use determined status instead of hardcoded 'generated'
        sourceId: body.sourceId || null
      }
    });

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        wordCount: result.statistics.wordCount,
        status: article.status,
        createdAt: article.createdAt,
        sourceId: article.sourceId,
      },
      metadata: {
        cost: result.metadata.cost,
        generationTime: result.metadata.generationTime,
        model: result.modelUsed,
        tokensUsed: result.metadata.tokensUsed
      }
    });

  } catch (error) {
    console.error('API Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API per generazione articoli',
    version: '1.0.0',
    endpoints: {
      POST: 'Genera nuovo articolo',
    },
    requiredFields: ['prompt'],
    optionalFields: ['model', 'targetWordCount', 'tone', 'style', 'keywords']
  });
}