import {
  AiService,
  ArticleGenerationRequest,
  ArticleGenerationResult,
  SeoGenerationRequest,
  SeoGenerationResult,
  SummaryGenerationRequest,
  SummaryGenerationResult,
  ContentImprovementRequest,
  ContentImprovementResult,
  ContentValidationRequest,
  ContentValidationResult,
  ServiceHealthInfo,
  AiServiceError,
  ContentStatistics,
  GenerationMetadata,
  ContentFormat
} from '../../domain/ports/AiService';
import { Result } from '../../shared/domain/types/Result';

/**
 * Perplexity AI service adapter.
 *
 * This adapter implements the AiService port using Perplexity's API.
 * Perplexity excels at research-based content generation with up-to-date
 * information and proper source citations.
 *
 * Key features:
 * - Real-time web search and analysis
 * - Source citation and fact-checking
 * - Multiple model support (llama, mistral, etc.)
 * - Rate limiting and error handling
 * - Structured output formatting
 */
export class PerplexityService implements AiService {
  private readonly baseUrl = 'https://api.perplexity.ai';
  private readonly apiKey: string;
  private readonly defaultModel = 'llama-3.1-70b-instruct';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Perplexity API key is required');
    }
    this.apiKey = apiKey;
  }

  async generateArticle(request: ArticleGenerationRequest): Promise<Result<ArticleGenerationResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      // Build the prompt for article generation
      const prompt = this.buildArticlePrompt(request);

      // ✅ SAFETY: Ensure valid Perplexity model
      const model = this.validateAndFixModel(request.model || this.defaultModel);

      console.log('🔧 [PerplexityService] Model validation:', {
        requestedModel: request.model,
        defaultModel: this.defaultModel,
        finalModel: model,
        isValidModel: this.isValidPerplexityModel(request.model || this.defaultModel)
      });

      // Make the API call
      const response = await this.makeApiCall('/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('article_generation')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: request.parameters?.maxTokens || 20000,
        temperature: request.parameters?.temperature || 0.7,
        top_p: request.parameters?.topP || 0.9,
        return_citations: true,
        return_images: false,
        search_domain_filter: request.metadata?.context?.domains,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty response from Perplexity')
        );
      }

      // Parse the structured response
      const parsedContent = this.parseArticleResponse(content);

      // Calculate statistics
      const statistics = this.calculateStatistics(parsedContent.content);

      // Build generation metadata
      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0),
        provider: 'perplexity',
        modelVersion: model,
        timestamp: new Date(),
        requestId: request.metadata?.requestId || 'unknown',
      };

      const result: ArticleGenerationResult = {
        title: parsedContent.title,
        content: parsedContent.content,
        format: 'html' as ContentFormat,
        statistics,
        modelUsed: model,
        metadata,
        rawResponse: parsedContent.rawResponse
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `Perplexity service error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async generateSeoMetadata(request: SeoGenerationRequest): Promise<Result<SeoGenerationResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      const prompt = this.buildSeoPrompt(request);

      const response = await this.makeApiCall('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('seo_generation')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent SEO output
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty SEO response from Perplexity')
        );
      }

      const parsedSeo = this.parseSeoResponse(content);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0),
        provider: 'perplexity',
        modelVersion: this.defaultModel,
        timestamp: new Date(),
        requestId: request.metadata?.requestId || 'unknown',
      };

      const result: SeoGenerationResult = {
        metaTitle: parsedSeo.metaTitle,
        metaDescription: parsedSeo.metaDescription,
        focusKeywords: parsedSeo.focusKeywords,
        metaTags: parsedSeo.metaTags,
        seoAnalysis: parsedSeo.seoAnalysis,
        metadata,
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `Perplexity SEO service error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async generateSummary(request: SummaryGenerationRequest): Promise<Result<SummaryGenerationResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      const prompt = this.buildSummaryPrompt(request);

      const response = await this.makeApiCall('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('summary_generation')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: request.targetLength || 300,
        temperature: 0.4,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content;

      if (!summary) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty summary response from Perplexity')
        );
      }

      const statistics = this.calculateStatistics(summary);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0),
        provider: 'perplexity',
        modelVersion: this.defaultModel,
        timestamp: new Date(),
        requestId: request.metadata?.requestId || 'unknown',
      };

      const result: SummaryGenerationResult = {
        summary: summary.trim(),
        summaryType: request.summaryType || 'excerpt',
        statistics,
        metadata,
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `Perplexity summary service error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async improveContent(request: ContentImprovementRequest): Promise<Result<ContentImprovementResult, AiServiceError>> {
    // Perplexity is optimized for research and generation, not content improvement
    // For a full implementation, you might delegate this to OpenAI or another service
    return Result.failure(
      AiServiceError.serviceUnavailable('Content improvement not available with Perplexity service')
    );
  }

  async validateContent(request: ContentValidationRequest): Promise<Result<ContentValidationResult, AiServiceError>> {
    // Perplexity is optimized for research and generation, not content validation
    // For a full implementation, you might delegate this to OpenAI or another service
    return Result.failure(
      AiServiceError.serviceUnavailable('Content validation not available with Perplexity service')
    );
  }

  async getServiceHealth(): Promise<Result<ServiceHealthInfo, AiServiceError>> {
    try {
      // Simple health check by making a minimal API call
      const response = await this.makeApiCall('/models', {});

      const healthInfo: ServiceHealthInfo = {
        isHealthy: response.ok,
        availableModels: response.ok ? await this.getAvailableModels() : [],
        rateLimits: {
          requestsPerMinute: 100, // Perplexity default
          tokensPerMinute: 20000,
          currentUsage: { requests: 0, tokens: 0 },
          resetTime: 60,
        },
        uptime: Date.now(), // Service start time
        lastChecked: new Date(),
      };

      return Result.success(healthInfo);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable('Perplexity health check failed')
      );
    }
  }

  /**
   * Makes an API call to Perplexity
   */
  private async makeApiCall(endpoint: string, payload: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    // 🚨 DEBUG: Log request details (hide sensitive data)
    console.log('🌐 [PerplexityService] Making API call:', {
      url,
      endpoint,
      hasApiKey: !!this.apiKey,
      apiKeyStart: this.apiKey?.substring(0, 8) + '...' || 'MISSING',
      payloadKeys: Object.keys(payload),
      model: payload.model,
      messagesCount: payload.messages?.length || 0
    });

    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AutoGeorge/1.0',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Handles API errors and converts them to domain errors
   */
  private async handleApiError(response: Response): Promise<Result<any, AiServiceError>> {
    const errorData = await response.json().catch(() => ({}));

    // 🚨 DEBUG: Log full error details
    console.error('🔥 [PerplexityService] API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      errorData,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyStart: this.apiKey?.substring(0, 8) + '...' || 'MISSING'
    });

    switch (response.status) {
      case 401:
        return Result.failure(AiServiceError.authenticationFailed('perplexity'));
      case 429:
        return Result.failure(AiServiceError.rateLimitExceeded('perplexity'));
      case 400:
        return Result.failure(
          new AiServiceError(
            `Invalid request: ${errorData.error?.message || 'Unknown error'}`,
            'INVALID_REQUEST',
            'perplexity'
          )
        );
      default:
        return Result.failure(AiServiceError.serviceUnavailable('perplexity'));
    }
  }

  /**
   * Builds the prompt for article generation
   */
  private buildArticlePrompt(request: ArticleGenerationRequest): string {
    // 🔧 FIX: If the prompt is already a complete unified prompt (contains JSON structure), use it as-is
    if (request.prompt && (request.prompt.includes('format JSON') || request.prompt.includes('struttura AVANZATA') || request.prompt.includes('```json'))) {
      console.log('🎯 [PerplexityService] Using unified prompt AS-IS (detected complete prompt structure)');
      return request.prompt;
    }

    // 🔧 LEGACY: Only build prompt for simple requests (backward compatibility)
    console.log('🔧 [PerplexityService] Building legacy prompt structure');
    let prompt = `Generate a comprehensive article based on the following prompt:\n\n${request.prompt}\n\n`;

    if (request.sourceContent) {
      prompt += `Use this source content as reference:\n${request.sourceContent}\n\n`;
    }

    prompt += 'Requirements:\n';

    if (request.targetWordCount) {
      prompt += `- Target length: approximately ${request.targetWordCount} words\n`;
    }

    if (request.tone) {
      prompt += `- Tone: ${request.tone}\n`;
    }

    if (request.style) {
      prompt += `- Style: ${request.style}\n`;
    }

    if (request.targetAudience) {
      prompt += `- Target audience: ${request.targetAudience}\n`;
    }

    if (request.keywords && request.keywords.length > 0) {
      prompt += `- Include these keywords naturally: ${request.keywords.join(', ')}\n`;
    }

    prompt += '\nFormat the response as JSON with "title" and "content" fields. Use clean HTML formatting for the content with proper tags (h2, h3, p, ul, li, strong, em).';

    return prompt;
  }

  /**
   * Builds the prompt for SEO metadata generation
   */
  private buildSeoPrompt(request: SeoGenerationRequest): string {
    let prompt = `Generate SEO metadata for the following article:\n\n`;
    prompt += `Title: ${request.title}\n\n`;
    prompt += `Content: ${request.content.substring(0, 2000)}...\n\n`;

    if (request.targetKeywords && request.targetKeywords.length > 0) {
      prompt += `Target keywords: ${request.targetKeywords.join(', ')}\n\n`;
    }

    prompt += 'Generate:\n';
    prompt += '1. SEO-optimized meta title (50-60 characters)\n';
    prompt += `2. Meta description (${request.metaDescriptionLength || 155} characters)\n`;
    prompt += '3. Focus keywords (3-5 primary keywords)\n';
    prompt += '4. Additional meta tags\n';
    prompt += '5. SEO analysis and score\n\n';

    prompt += 'Format the response as JSON with the appropriate fields.';

    return prompt;
  }

  /**
   * Builds the prompt for summary generation
   */
  private buildSummaryPrompt(request: SummaryGenerationRequest): string {
    let prompt = `Create a ${request.summaryType || 'excerpt'} summary of the following content:\n\n`;
    prompt += `${request.content}\n\n`;

    if (request.targetLength) {
      prompt += `Target length: approximately ${request.targetLength} characters\n`;
    }

    prompt += 'The summary should capture the key points and main message of the content.';

    return prompt;
  }

  /**
   * Gets system prompts for different generation types
   */
  private getSystemPrompt(type: string): string {
    switch (type) {
      case 'article_generation':
        return `You are an expert content writer and researcher. Generate well-researched, engaging articles with proper structure, citations, and SEO optimization. Always provide accurate, up-to-date information with proper sourcing.`;

      case 'seo_generation':
        return `You are an SEO expert. Generate optimized metadata that improves search engine rankings while maintaining readability and user engagement.`;

      case 'summary_generation':
        return `You are an expert at creating concise, accurate summaries that capture the essence of content while maintaining clarity and engagement.`;

      default:
        return `You are a helpful AI assistant focused on content creation and optimization.`;
    }
  }

  /**
   * Parses the article response from Perplexity
   * ✅ ENHANCED-v4: Improved JSON extraction and parsing logic
   */
  private parseArticleResponse(content: string): { title: string; content: string; rawResponse?: any } {
    // 🚨 DEBUG: Log raw content from Perplexity
    console.log('🤖 [PerplexityService] Raw content from API [ENHANCED-v4]:', {
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 300) || 'EMPTY',
      hasContent: !!content,
      deployTimestamp: new Date().toISOString()
    });

    // ✅ STEP 1: Try multiple JSON extraction methods
    const jsonExtractionResults = this.extractJsonFromContent(content);

    for (const { method, extractedContent } of jsonExtractionResults) {
      try {
        const parsed = JSON.parse(extractedContent);
        console.log(`✅ [PerplexityService] JSON parsed successfully using method: ${method}`);

        // ✅ STEP 2: Try different content structures
        const structureResult = this.parseContentStructure(parsed, method);
        if (structureResult.success) {
          return structureResult.result;
        }
      } catch (parseError) {
        console.log(`❌ [PerplexityService] JSON parsing failed for method '${method}':`, parseError);
        continue;
      }
    }

    // ✅ STEP 3: Smart text extraction as final fallback
    console.log('🔄 [PerplexityService] All JSON parsing failed, using smart text extraction');
    return this.smartTextExtraction(content);
  }

  /**
   * ✅ NEW: Extracts JSON from content using multiple methods
   */
  private extractJsonFromContent(content: string): Array<{ method: string; extractedContent: string }> {
    const results: Array<{ method: string; extractedContent: string }> = [];

    // Method 1: Direct JSON parsing
    results.push({ method: 'direct', extractedContent: content });

    // Method 2: Remove ```json code blocks
    if (content.includes('```json')) {
      const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
      const match = codeBlockRegex.exec(content);
      if (match && match[1]) {
        results.push({ method: 'code-block', extractedContent: match[1].trim() });
      }
    }

    // Method 3: Extract JSON from mixed content (look for { ... })
    const jsonRegex = /\{[\s\S]*\}/;
    const jsonMatch = content.match(jsonRegex);
    if (jsonMatch) {
      results.push({ method: 'regex-extraction', extractedContent: jsonMatch[0] });
    }

    // Method 4: Look for quoted JSON strings (when AI wraps JSON in quotes)
    const quotedJsonRegex = /"\{[\s\S]*\}"/;
    const quotedMatch = content.match(quotedJsonRegex);
    if (quotedMatch) {
      try {
        const unquoted = JSON.parse(quotedMatch[0]); // Remove outer quotes
        results.push({ method: 'quoted-json', extractedContent: unquoted });
      } catch {
        // Skip if unquoting fails
      }
    }

    // Method 5: Line-by-line search for JSON
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('{')) {
        // Find the matching closing brace
        let braceCount = 0;
        let jsonCandidate = '';
        for (let j = i; j < lines.length; j++) {
          jsonCandidate += lines[j] + '\n';
          for (const char of lines[j]) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount === 0 && char === '}') {
              results.push({ method: 'line-scan', extractedContent: jsonCandidate.trim() });
              break;
            }
          }
          if (braceCount === 0) break;
        }
        break;
      }
    }

    console.log('🔍 [PerplexityService] JSON extraction methods found:', results.map(r => r.method));
    return results;
  }

  /**
   * ✅ NEW: Parse different content structures
   */
  private parseContentStructure(parsed: any, method: string): { success: boolean; result?: any } {
    console.log(`🔍 [PerplexityService] Analyzing structure from method '${method}':`, {
      type: typeof parsed,
      keys: typeof parsed === 'object' ? Object.keys(parsed) : [],
      hasTitle: !!(parsed?.title),
      hasContent: !!(parsed?.content),
      hasArticle: !!(parsed?.article)
    });

    // Structure 1: Advanced article structure
    if (parsed.article && parsed.article.basic_data && parsed.article.content) {
      const article = parsed.article;
      const result = {
        title: article.basic_data.title || article.seo_critical?.seo_title || 'Generated Article',
        content: article.content || 'Article content generated by AutoGeorge AI.',
        rawResponse: { parsed, method, structure: 'advanced' }
      };

      console.log('✅ [PerplexityService] Advanced structure parsed:', {
        titleLength: result.title?.length || 0,
        contentLength: result.content?.length || 0,
        titlePreview: result.title?.substring(0, 50) || 'EMPTY'
      });

      return { success: true, result };
    }

    // Structure 2: Simple title/content structure
    if (parsed.title && parsed.content) {
      const result = {
        title: parsed.title.trim(),
        content: parsed.content.trim(),
        rawResponse: { parsed, method, structure: 'simple' }
      };

      console.log('✅ [PerplexityService] Simple structure parsed:', {
        titleLength: result.title?.length || 0,
        contentLength: result.content?.length || 0,
        titlePreview: result.title?.substring(0, 50) || 'EMPTY'
      });

      return { success: true, result };
    }

    // Structure 3: Alternative field names
    const titleFields = ['title', 'headline', 'subject', 'name'];
    const contentFields = ['content', 'body', 'text', 'article', 'description'];

    let foundTitle = '';
    let foundContent = '';

    for (const field of titleFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        foundTitle = parsed[field].trim();
        break;
      }
    }

    for (const field of contentFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        foundContent = parsed[field].trim();
        break;
      }
    }

    if (foundTitle && foundContent) {
      const result = {
        title: foundTitle,
        content: foundContent,
        rawResponse: { parsed, method, structure: 'alternative-fields' }
      };

      console.log('✅ [PerplexityService] Alternative fields structure parsed:', {
        titleLength: result.title?.length || 0,
        contentLength: result.content?.length || 0,
        titleField: titleFields.find(f => parsed[f]),
        contentField: contentFields.find(f => parsed[f])
      });

      return { success: true, result };
    }

    console.log('❌ [PerplexityService] No recognized structure found in parsed object');
    return { success: false };
  }

  /**
   * ✅ NEW: Smart text extraction when JSON parsing fails
   */
  private smartTextExtraction(content: string): { title: string; content: string; rawResponse?: any } {
    console.log('🔄 [PerplexityService] Starting smart text extraction...');

    // Try to find title patterns in the text
    const titlePatterns = [
      /(?:^|\n)#+\s*(.+?)(?:\n|$)/,  // Markdown headers
      /(?:^|\n)Title[:\s]*(.+?)(?:\n|$)/i,
      /(?:^|\n)(.{10,100})(?:\n\n|\n[^\n]{100})/,  // First substantial line
    ];

    let extractedTitle = '';
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedTitle = match[1].trim().replace(/["'`]/g, '');
        if (extractedTitle.length >= 10 && extractedTitle.length <= 200) {
          break;
        }
      }
    }

    // Extract content (everything after title, or full content if no title found)
    let extractedContent = content;
    if (extractedTitle) {
      const titleIndex = content.indexOf(extractedTitle);
      if (titleIndex >= 0) {
        extractedContent = content.substring(titleIndex + extractedTitle.length).trim();
      }
    }

    // Clean up content
    extractedContent = extractedContent
      .replace(/^[\n\r\s]*/, '')  // Remove leading whitespace
      .replace(/```[a-z]*\n?/g, '')  // Remove code block markers
      .replace(/^["'`]+(.*?)["'`]+$/s, '$1')  // Remove surrounding quotes
      .trim();

    const result = {
      title: extractedTitle.length >= 10 ? extractedTitle : 'Articolo Generato da AutoGeorge AI',
      content: extractedContent || 'Contenuto generato automaticamente.',
      rawResponse: {
        extractedTitle,
        extractedContent,
        originalContent: content.substring(0, 500),
        method: 'smart-text-extraction',
        fallback: true
      }
    };

    console.log('🤖 [PerplexityService] Smart text extraction result:', {
      titleLength: result.title?.length || 0,
      contentLength: result.content?.length || 0,
      titlePreview: result.title?.substring(0, 50) || 'EMPTY',
      contentPreview: result.content?.substring(0, 100) || 'EMPTY',
      usedFallbackTitle: extractedTitle.length < 10
    });

    return result;
  }

  /**
   * Parses the SEO response from Perplexity
   */
  private parseSeoResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      // Fallback parsing for non-JSON responses
      return {
        metaTitle: 'SEO Optimized Title',
        metaDescription: 'SEO optimized description...',
        focusKeywords: [],
        metaTags: {},
        seoAnalysis: { score: 75, recommendations: [] },
      };
    }
  }

  /**
   * Calculates content statistics
   */
  private calculateStatistics(content: string): ContentStatistics {
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    return {
      characterCount,
      wordCount,
      sentenceCount,
      paragraphCount,
      readingTime,
    };
  }

  /**
   * Calculates the cost of the API call
   */
  private calculateCost(tokens: number): number {
    // Perplexity pricing (example rates)
    const costPer1kTokens = 0.002; // $0.002 per 1K tokens
    return (tokens / 1000) * costPer1kTokens;
  }

  /**
   * Validates and fixes model names for Perplexity compatibility
   */
  private validateAndFixModel(model: string): string {
    // ✅ CORRECT: Official Perplexity model IDs from documentation
    const validModels = [
      'sonar-pro',
      'sonar',
      'llama-3.1-8b-instruct',
      'llama-3.1-70b-instruct'
    ];

    // If model is valid, return as-is
    if (validModels.includes(model)) {
      return model;
    }

    // ✅ FIXED: Map to correct Perplexity model IDs
    const modelMappings: Record<string, string> = {
      'gpt-4': 'sonar-pro',
      'gpt-4-turbo': 'sonar-pro',
      'gpt-3.5-turbo': 'sonar',
      'gpt-4o': 'sonar-pro',
      'claude-3-5-sonnet': 'sonar-pro',
      'llama-3.1-sonar-large-128k-online': 'sonar-pro', // Fix our wrong model ID
      'llama-3.1-sonar-huge-128k-online': 'sonar-pro'
    };

    const mappedModel = modelMappings[model];
    if (mappedModel) {
      console.warn(`🔧 [PerplexityService] Auto-mapped invalid model '${model}' to '${mappedModel}'`);
      return mappedModel;
    }

    // Final fallback to safe default
    console.warn(`🚨 [PerplexityService] Unknown model '${model}', using fallback 'sonar-pro'`);
    return 'sonar-pro';
  }

  /**
   * Checks if a model is valid for Perplexity
   */
  private isValidPerplexityModel(model: string): boolean {
    const validModels = [
      'sonar-pro',
      'sonar',
      'llama-3.1-8b-instruct',
      'llama-3.1-70b-instruct'
    ];
    return validModels.includes(model);
  }

  /**
   * Gets available models from Perplexity
   */
  private async getAvailableModels(): Promise<any[]> {
    // Based on current Perplexity API documentation
    return [
      {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        description: 'Enhanced online research with real-time web access',
        supportedContentTypes: ['article', 'blog-post', 'news'],
        maxContextLength: 127072,
        costPer1kTokens: 0.004,
        isAvailable: true,
      },
      {
        id: 'sonar',
        name: 'Sonar',
        description: 'Quick factual queries and topic summaries',
        supportedContentTypes: ['article', 'blog-post', 'news'],
        maxContextLength: 127072,
        costPer1kTokens: 0.002,
        isAvailable: true,
      },
      {
        id: 'llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        description: 'Large language model for complex text generation',
        supportedContentTypes: ['article', 'blog-post', 'technical'],
        maxContextLength: 131072,
        costPer1kTokens: 0.001,
        isAvailable: true,
      },
      {
        id: 'llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        description: 'Efficient model for basic text generation',
        supportedContentTypes: ['article', 'blog-post'],
        maxContextLength: 131072,
        costPer1kTokens: 0.0002,
        isAvailable: true,
      },
    ];
  }
}