import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

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
    const body: GenerateArticleRequest = await request.json();

    // Validate required fields
    if (!body.prompt || body.prompt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Prompt deve essere di almeno 10 caratteri' },
        { status: 400 }
      );
    }

    // Simulate AI generation (replace with actual AI service)
    const prompt = body.prompt.trim();
    const wordCount = body.targetWordCount || 800;
    const tone = body.tone || 'professionale';
    const style = body.style || 'giornalistico';
    const keywords = body.keywords || [];

    // Generate title from prompt
    const title = `[AI Generated] ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`;

    // Generate content
    const content = `# ${title}

## Introduzione

Questo articolo è stato generato automaticamente utilizzando AI. Il contenuto è basato sul seguente prompt: "${prompt}"

## Contenuto Principale

${prompt}

## Parole Chiave
${keywords.length > 0 ? keywords.join(', ') : 'Nessuna parola chiave specificata'}

## Configurazione
- **Numero di parole target**: ${wordCount}
- **Tono**: ${tone}
- **Stile**: ${style}
- **Modello**: ${body.model || 'gpt-4'}

---

*Articolo generato automaticamente da AutoGeorge*`;

    // Create the article in database
    const article = await prisma.article.create({
      data: {
        title,
        content,
        status: 'generated',
        sourceId: body.sourceId || null
      }
    });

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        content: article.content,
        wordCount: Math.floor(content.length / 5),
        status: article.status,
        createdAt: article.createdAt,
        sourceId: article.sourceId,
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