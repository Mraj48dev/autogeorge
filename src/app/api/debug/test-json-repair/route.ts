import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/debug/test-json-repair
 * Test endpoint per verificare il sistema di riparazione JSON troncati
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n🧪 [DEBUG] Testing JSON repair system...');

    // Simula JSON troncati tipici che causano problemi
    const truncatedJsonTests = [
      {
        name: 'Incomplete field at end',
        json: `{
          "article": {
            "basic_data": {
              "title": "Come aggiornare la versione PHP su un sito Hosting Aruba",
              "slug": "aggiornare-php-aruba",
              "category": "Tecnologia"
            },
            "content": "Articolo completo qui...",
            "seo_critical": {
              "focus_keyword": "PHP aggior"`
      },
      {
        name: 'Missing closing braces',
        json: `{
          "article": {
            "basic_data": {
              "title": "MPS Sceglie i Nuovi Leader di Mediobanca",
              "category": "Finance"
            },
            "content": "Contenuto dell'articolo qui..."`
      },
      {
        name: 'Incomplete string at end',
        json: `{
          "article": {
            "basic_data": {
              "title": "Immobiliare Sempre Verde: Sostenibilità",
              "slug": "immobiliare-sostenibile"
            },
            "related_keywords": [
              "sostenibilità",
              "immobiliare verde"`
      }
    ];

    const results = [];

    // Test ogni caso di JSON troncato
    for (const test of truncatedJsonTests) {
      try {
        console.log(`🔧 [JSON Repair Test] Testing: ${test.name}`);

        // Simula il processo di riparazione
        const repaired = repairTruncatedJson(test.json);

        // Tenta di parsare il JSON riparato
        const parsed = JSON.parse(repaired);

        // Estrai titolo per test
        const title = extractTitleFromParsed(parsed);

        results.push({
          test: test.name,
          original: test.json.substring(0, 100) + '...',
          repaired: repaired.substring(0, 200) + '...',
          parsedSuccessfully: true,
          extractedTitle: title,
          status: 'SUCCESS'
        });

        console.log(`✅ [JSON Repair] ${test.name}: SUCCESS - Title: "${title}"`);

      } catch (error) {
        console.error(`❌ [JSON Repair] ${test.name}: FAILED - ${error}`);

        results.push({
          test: test.name,
          original: test.json.substring(0, 100) + '...',
          repaired: null,
          parsedSuccessfully: false,
          extractedTitle: null,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const totalTests = results.length;

    return NextResponse.json({
      success: true,
      testResults: {
        summary: {
          totalTests,
          successful: successCount,
          failed: totalTests - successCount,
          successRate: `${Math.round((successCount / totalTests) * 100)}%`
        },
        tests: results
      },
      message: `JSON repair system tested: ${successCount}/${totalTests} tests passed`
    });

  } catch (error) {
    console.error('💥 [DEBUG] JSON repair test failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'JSON repair test failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/debug/test-json-repair
 * Info about the test endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/debug/test-json-repair',
    description: 'Test endpoint for JSON repair system',
    usage: 'POST to run the test',
    tests: [
      'Incomplete field at end',
      'Missing closing braces',
      'Incomplete string at end'
    ]
  });
}

/**
 * Helper function to repair truncated JSON (mirrors PerplexityService logic)
 */
function repairTruncatedJson(jsonString: string): string {
  try {
    // First try to parse as-is
    JSON.parse(jsonString);
    return jsonString; // Already valid
  } catch (error) {
    console.log('🔧 Attempting to repair truncated JSON...');

    let repaired = jsonString.trim();

    // Strategy 1: Count braces and close missing ones
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }

    // Strategy 2: Remove incomplete last field if it looks cut off
    const incompleteFieldRegex = /,\s*"[^"]*":\s*"[^"]*$/;
    if (incompleteFieldRegex.test(repaired)) {
      repaired = repaired.replace(incompleteFieldRegex, '');
      console.log('🔧 Removed incomplete field at end');
    }

    // Strategy 3: Close open string if we end in the middle of one
    if (inString) {
      repaired += '"';
      console.log('🔧 Closed open string');
    }

    // Strategy 4: Close missing braces and brackets
    for (let i = 0; i < openBrackets; i++) {
      repaired += ']';
    }
    for (let i = 0; i < openBraces; i++) {
      repaired += '}';
    }

    if (openBraces > 0 || openBrackets > 0) {
      console.log(`🔧 Closed ${openBraces} braces and ${openBrackets} brackets`);
    }

    // Strategy 5: Try to validate the repaired JSON
    try {
      JSON.parse(repaired);
      console.log('✅ JSON repair successful');
      return repaired;
    } catch (e) {
      console.log('❌ JSON repair failed, returning original');
      return jsonString;
    }
  }
}

/**
 * Helper function to extract title from parsed JSON
 */
function extractTitleFromParsed(parsed: any): string {
  // Try different paths for title
  if (parsed?.article?.basic_data?.title) {
    return parsed.article.basic_data.title;
  }
  if (parsed?.article?.seo_critical?.seo_title) {
    return parsed.article.seo_critical.seo_title;
  }
  if (parsed?.title) {
    return parsed.title;
  }
  return 'No title found';
}