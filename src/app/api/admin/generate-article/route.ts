import { NextRequest, NextResponse } from 'next/server';
import { Container } from '@/composition-root/container';

interface GenerateArticleRequest {
  prompt: string;
  model?: string;
  targetWordCount?: number;
  tone?: string;
  style?: string;
  keywords?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateArticleRequest = await request.json();

    // Validate required fields
    if (!body.prompt || body.prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Prompt deve essere di almeno 10 caratteri' },
        { status: 400 }
      );
    }

    // Initialize container and get use case
    const container = new Container();
    const generateArticle = container.generateArticle;

    // Prepare input
    const input = {
      prompt: body.prompt.trim(),
      model: body.model || 'sonar',
      targetWordCount: body.targetWordCount || 800,
      tone: body.tone || 'professional',
      style: body.style || 'blog',
      keywords: body.keywords || [],
      temperature: 0.7,
      maxTokens: 4000,
    };

    // Execute use case
    const result = await generateArticle.execute(input);

    if (result.isFailure()) {
      console.error('Article generation failed:', result.error);
      return NextResponse.json(
        { error: result.error.message || 'Errore durante la generazione' },
        { status: 500 }
      );
    }

    const article = result.value;

    return NextResponse.json({
      success: true,
      article: {
        id: article.articleId,
        title: article.title,
        content: article.content,
        wordCount: article.wordCount,
        status: article.status,
        createdAt: article.createdAt,
        sourceId: article.sourceId || null,
      }
    });

  } catch (error) {
    console.error('API Error:', error);
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