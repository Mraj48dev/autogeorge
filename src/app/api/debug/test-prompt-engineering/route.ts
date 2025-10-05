import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG endpoint per testare ChatGPT prompt engineering
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

    console.log('🧪 [DEBUG] Testing ChatGPT prompt generation...');
    console.log('📝 [DEBUG] Title:', title);
    console.log('📝 [DEBUG] Content preview:', content.substring(0, 100) + '...');

    // Template predefinito
    const template = `Analizza questo articolo e genera un prompt per DALL-E che sia ottimizzato per evitare contenuto che viola le policy. Il prompt deve descrivere un'immagine che rappresenti il tema dell'articolo in modo creativo e sicuro:

Titolo: {title}
Contenuto: {article}`;

    // Replace placeholders
    const processedTemplate = template
      .replace(/{title}/g, title)
      .replace(/{article}/g, content.substring(0, 500));

    console.log('🎯 [DEBUG] Template processed:', processedTemplate);

    // Call ChatGPT
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

    console.log('✅ [DEBUG] ChatGPT generated prompt:', generatedPrompt);

    // Test DALL-E generation with the prompt
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: generatedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
        response_format: 'url'
      }),
    });

    if (!dalleResponse.ok) {
      const errorData = await dalleResponse.json();
      console.error('❌ [DEBUG] DALL-E failed:', errorData);
      return NextResponse.json({
        success: false,
        error: `DALL-E failed: ${errorData.error?.message || dalleResponse.status}`,
        generatedPrompt: generatedPrompt
      }, { status: 500 });
    }

    const dalleData = await dalleResponse.json();
    const imageUrl = dalleData.data?.[0]?.url;

    console.log('✅ [DEBUG] DALL-E generated image:', imageUrl);

    return NextResponse.json({
      success: true,
      data: {
        generatedPrompt: generatedPrompt,
        imageUrl: imageUrl,
        originalTemplate: template,
        processedTemplate: processedTemplate,
        chatGptModel: 'gpt-4',
        dalleModel: 'dall-e-3'
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}