import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/articles/[id]/raw-json
 * Returns the raw JSON response from AI generation for debugging purposes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    // Get article with all metadata
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        aiModel: true,
        articleData: true,
        aiPrompts: true,
        generationConfig: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Build comprehensive debug data
    const debugData = {
      article: {
        id: article.id,
        title: article.title,
        aiModel: article.aiModel,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      },
      rawResponse: article.articleData || null,
      prompts: article.aiPrompts || null,
      generationConfig: article.generationConfig || null,
      metadata: {
        hasRawResponse: !!article.articleData,
        hasPrompts: !!article.aiPrompts,
        hasGenerationConfig: !!article.generationConfig,
        exportedAt: new Date().toISOString()
      }
    };

    // Return as HTML page for better JSON viewing
    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Debug - ${article.title}</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: #d4d4d4;
            line-height: 1.6;
        }

        .header {
            background-color: #2d2d30;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #007acc;
        }

        .header h1 {
            margin: 0 0 10px 0;
            color: #ffffff;
            font-size: 24px;
        }

        .header p {
            margin: 0;
            color: #cccccc;
            font-size: 14px;
        }

        .json-container {
            background-color: #2d2d30;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            border: 1px solid #3e3e42;
        }

        .json-viewer {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.6;
        }

        .key {
            color: #9cdcfe;
        }

        .string {
            color: #ce9178;
        }

        .number {
            color: #b5cea8;
        }

        .boolean {
            color: #569cd6;
        }

        .null {
            color: #569cd6;
        }

        .copy-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
        }

        .copy-btn:hover {
            background-color: #005a9e;
        }

        .copy-success {
            background-color: #28a745 !important;
        }

        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #3e3e42;
        }

        .tab {
            padding: 10px 20px;
            cursor: pointer;
            background-color: #252526;
            border: none;
            color: #cccccc;
            margin-right: 5px;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
        }

        .tab.active {
            background-color: #2d2d30;
            color: #ffffff;
            border-bottom: 2px solid #007acc;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 JSON Debug - AutoGeorge</h1>
        <p><strong>Articolo:</strong> ${article.title}</p>
        <p><strong>ID:</strong> ${article.id}</p>
        <p><strong>Modello AI:</strong> ${article.aiModel || 'N/A'}</p>
        <p><strong>Generato:</strong> ${new Date(article.createdAt).toLocaleString('it-IT')}</p>
    </div>

    <div class="tabs">
        <button class="tab active" onclick="showTab('complete')">Completo</button>
        <button class="tab" onclick="showTab('rawResponse')">Raw Response</button>
        <button class="tab" onclick="showTab('prompts')">Prompts</button>
        <button class="tab" onclick="showTab('config')">Config</button>
    </div>

    <button class="copy-btn" onclick="copyToClipboard()">📋 Copia JSON</button>

    <div id="complete" class="tab-content active">
        <div class="json-container">
            <div class="json-viewer">${JSON.stringify(debugData, null, 2)}</div>
        </div>
    </div>

    <div id="rawResponse" class="tab-content">
        <div class="json-container">
            <div class="json-viewer">${JSON.stringify(debugData.rawResponse, null, 2)}</div>
        </div>
    </div>

    <div id="prompts" class="tab-content">
        <div class="json-container">
            <div class="json-viewer">${JSON.stringify(debugData.prompts, null, 2)}</div>
        </div>
    </div>

    <div id="config" class="tab-content">
        <div class="json-container">
            <div class="json-viewer">${JSON.stringify(debugData.generationConfig, null, 2)}</div>
        </div>
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));

            // Hide all tab buttons
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));

            // Show selected tab content
            document.getElementById(tabName).classList.add('active');

            // Show selected tab button
            event.target.classList.add('active');
        }

        function copyToClipboard() {
            const jsonText = ${JSON.stringify(JSON.stringify(debugData, null, 2))};
            navigator.clipboard.writeText(jsonText).then(() => {
                const btn = document.querySelector('.copy-btn');
                btn.textContent = '✅ Copiato!';
                btn.classList.add('copy-success');

                setTimeout(() => {
                    btn.textContent = '📋 Copia JSON';
                    btn.classList.remove('copy-success');
                }, 2000);
            }).catch(err => {
                console.error('Errore copia:', err);
                alert('Errore durante la copia');
            });
        }

        // Syntax highlighting for JSON
        function highlightJSON() {
            const viewers = document.querySelectorAll('.json-viewer');
            viewers.forEach(viewer => {
                let html = viewer.innerHTML;

                // Highlight strings
                html = html.replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:');
                html = html.replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>');

                // Highlight numbers
                html = html.replace(/: (\\d+\\.?\\d*)/g, ': <span class="number">$1</span>');

                // Highlight booleans
                html = html.replace(/: (true|false)/g, ': <span class="boolean">$1</span>');

                // Highlight null
                html = html.replace(/: (null)/g, ': <span class="null">$1</span>');

                viewer.innerHTML = html;
            });
        }

        // Apply syntax highlighting on page load
        document.addEventListener('DOMContentLoaded', highlightJSON);
    </script>
</body>
</html>`;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error fetching article raw JSON:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}