import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG endpoint per testare solo ChatGPT (senza DALL-E)
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not configured'
      }, { status: 500 });
    }

    console.log('🧪 [DEBUG] Testing ChatGPT prompt generation ONLY...');

    // Template predefinito
    const template = `Analizza questo articolo e genera un prompt per DALL-E che sia ottimizzato per evitare contenuto che viola le policy. Il prompt deve descrivere un'immagine che rappresenti il tema dell'articolo in modo creativo e sicuro:

Titolo: {title}
Contenuto: {article}`;

    // Replace placeholders
    const processedTemplate = template
      .replace(/{title}/g, title)
      .replace(/{article}/g, content.substring(0, 500));

    console.log('🎯 [DEBUG] Sending to ChatGPT...');

    // Call ChatGPT ONLY
    const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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

    if (!chatGptResponse.ok) {
      const errorData = await chatGptResponse.json();
      console.error('❌ [DEBUG] ChatGPT failed:', errorData);
      return NextResponse.json({
        success: false,
        error: `ChatGPT failed: ${errorData.error?.message || chatGptResponse.status}`
      }, { status: 500 });
    }

    const data = await chatGptResponse.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    console.log('✅ [DEBUG] ChatGPT SUCCESS! Generated prompt:', generatedPrompt);

    return NextResponse.json({
      success: true,
      data: {
        generatedPrompt: generatedPrompt,
        originalTemplate: template,
        processedTemplate: processedTemplate,
        model: 'gpt-4',
        inputTitle: title,
        inputContent: content.substring(0, 100) + '...'
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}