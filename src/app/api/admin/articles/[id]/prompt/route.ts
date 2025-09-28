import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles/[id]/prompt
 * Returns a dedicated page showing only the prompt sent to Perplexity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    // Get article with prompt data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        aiModel: true,
        aiPrompts: true,
        createdAt: true,
        sourceId: true,
        source: {
          select: {
            name: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Extract prompt with multiple fallback strategies
    let promptContent = 'Prompt non trovato nel database';
    let promptFound = false;

    if (article.aiPrompts) {
      // Try different extraction methods
      const aiPrompts = article.aiPrompts as any;

      if (aiPrompts.unifiedPromptSent) {
        promptContent = aiPrompts.unifiedPromptSent;
        promptFound = true;
      } else if (aiPrompts.promptSent) {
        promptContent = aiPrompts.promptSent;
        promptFound = true;
      } else if (aiPrompts.prompt) {
        promptContent = aiPrompts.prompt;
        promptFound = true;
      } else if (typeof aiPrompts === 'string') {
        promptContent = aiPrompts;
        promptFound = true;
      } else {
        // Build prompt from components if available
        const components = [];
        if (aiPrompts.titlePrompt) components.push(`TITOLO: ${aiPrompts.titlePrompt}`);
        if (aiPrompts.contentPrompt) components.push(`CONTENUTO: ${aiPrompts.contentPrompt}`);
        if (aiPrompts.seoPrompt) components.push(`SEO: ${aiPrompts.seoPrompt}`);
        if (aiPrompts.feedItemContent) components.push(`FONTE: ${aiPrompts.feedItemContent}`);

        if (components.length > 0) {
          promptContent = components.join('\n\n');
          promptFound = true;
        }
      }
    }

    // Clean up escaped characters
    if (promptFound) {
      promptContent = promptContent
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 Prompt Perplexity - ${article.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: rgba(45, 45, 60, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .header h1 {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header .emoji {
            font-size: 32px;
            background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .metadata-item {
            background: rgba(30, 30, 46, 0.6);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .metadata-label {
            font-size: 12px;
            color: #a0a0b0;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }

        .metadata-value {
            color: #ffffff;
            font-weight: 500;
        }

        .prompt-container {
            background: rgba(30, 30, 46, 0.8);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .prompt-header {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            padding: 20px 30px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .prompt-header h2 {
            font-size: 20px;
            font-weight: 600;
        }

        .copy-button {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .copy-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        .copy-button.copied {
            background: rgba(34, 197, 94, 0.3);
            border-color: rgba(34, 197, 94, 0.5);
        }

        .prompt-content {
            padding: 30px;
            max-height: 70vh;
            overflow-y: auto;
        }

        .prompt-text {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.8;
            color: #e0e0e0;
            background: rgba(20, 20, 30, 0.5);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        }

        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-found {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-missing {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #a0a0b0;
            text-decoration: none;
            font-size: 14px;
            margin-bottom: 20px;
            transition: color 0.3s ease;
        }

        .back-link:hover {
            color: #ffffff;
        }

        .scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .scrollbar::-webkit-scrollbar {
            width: 8px;
        }

        .scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }

        .scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }

        .scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }

            .header {
                padding: 20px;
            }

            .header h1 {
                font-size: 24px;
            }

            .metadata {
                grid-template-columns: 1fr;
            }

            .prompt-header {
                padding: 15px 20px;
                flex-direction: column;
                gap: 15px;
                align-items: flex-start;
            }

            .prompt-content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin/articles" class="back-link">
            ← Torna agli articoli
        </a>

        <div class="header">
            <h1>
                <span class="emoji">🤖</span>
                Prompt inviato a Perplexity
            </h1>

            <div class="metadata">
                <div class="metadata-item">
                    <div class="metadata-label">Articolo</div>
                    <div class="metadata-value">${article.title}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">ID</div>
                    <div class="metadata-value">${article.id}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Modello AI</div>
                    <div class="metadata-value">${article.aiModel || 'N/A'}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Fonte</div>
                    <div class="metadata-value">${article.source?.name || 'N/A'}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Data creazione</div>
                    <div class="metadata-value">${new Date(article.createdAt).toLocaleString('it-IT')}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Status Prompt</div>
                    <div class="metadata-value">
                        <span class="status-badge ${promptFound ? 'status-found' : 'status-missing'}">
                            ${promptFound ? '✓ Trovato' : '✗ Non trovato'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div class="prompt-container">
            <div class="prompt-header">
                <h2>Contenuto del Prompt</h2>
                <button class="copy-button" onclick="copyPrompt()">
                    📋 Copia Prompt
                </button>
            </div>

            <div class="prompt-content scrollbar">
                <div class="prompt-text" id="promptText">${promptContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
        </div>
    </div>

    <script>
        async function copyPrompt() {
            const promptText = document.getElementById('promptText').textContent;
            const button = document.querySelector('.copy-button');

            try {
                await navigator.clipboard.writeText(promptText);

                const originalText = button.innerHTML;
                button.innerHTML = '✅ Copiato!';
                button.classList.add('copied');

                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('copied');
                }, 2000);

            } catch (err) {
                console.error('Errore durante la copia:', err);
                alert('Errore durante la copia del prompt');
            }
        }

        // Auto-scroll to top when page loads
        window.addEventListener('load', () => {
            window.scrollTo(0, 0);
        });
    </script>
</body>
</html>`;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error fetching article prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}