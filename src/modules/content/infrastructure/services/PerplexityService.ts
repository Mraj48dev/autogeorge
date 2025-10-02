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
  private readonly defaultModel = 'sonar-pro';

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
        max_tokens: request.parameters?.maxTokens || 8000,
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
   * ✅ ENHANCED: Supports both legacy and new advanced JSON structure
   */
  private parseArticleResponse(content: string): { title: string; content: string; rawResponse?: any } {
    // 🚨 DEBUG: Log raw content from Perplexity
    console.log('🤖 [PerplexityService] Raw content from API [ENHANCED-v3]:', {
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) || 'EMPTY',
      hasContent: !!content,
      deployTimestamp: new Date().toISOString()
    });

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);

      // ✅ NEW: Support for advanced article structure
      if (parsed.article && parsed.article.basic_data && parsed.article.content) {
        // New advanced structure with simplified content
        const article = parsed.article;

        const result = {
          title: article.basic_data.title || article.seo_critical?.seo_title || 'Generated Article',
          content: article.content || 'Article content generated by AutoGeorge AI.',
          rawResponse: parsed // ✅ Store complete JSON for debugging
        };

        console.log('🤖 [PerplexityService] Advanced structure parsed:', {
          titleLength: result.title?.length || 0,
          contentLength: result.content?.length || 0,
          titlePreview: result.title?.substring(0, 50) || 'EMPTY',
          hasBasicData: !!article.basic_data,
          hasSeoCritical: !!article.seo_critical,
          hasFeaturedImage: !!article.featured_image,
          hasUserEngagement: !!article.user_engagement,
          hasInternalSeo: !!article.internal_seo,
          category: article.basic_data?.category,
          tagsCount: article.basic_data?.tags?.length || 0,
          focusKeyword: article.seo_critical?.focus_keyword,
          relatedKeywordsCount: article.internal_seo?.related_keywords?.length || 0
        });

        return result;
      }

      // ✅ LEGACY: Support for old simple structure (backward compatibility)
      const result = {
        title: (parsed.title && parsed.title.trim()) || 'Generated Article',
        content: (parsed.content && parsed.content.trim()) || content || 'Article content generated by AutoGeorge AI.',
        rawResponse: parsed // ✅ Store complete JSON for debugging
      };

      console.log('🤖 [PerplexityService] Legacy structure parsed:', {
        titleLength: result.title?.length || 0,
        contentLength: result.content?.length || 0,
        titlePreview: result.title?.substring(0, 50) || 'EMPTY',
        contentPreview: result.content?.substring(0, 100) || 'EMPTY',
        hasMetaDescription: !!parsed.metaDescription,
        hasSeoTags: !!parsed.seoTags,
        hasImagePrompt: !!parsed.imagePrompt,
        fullStructure: Object.keys(parsed)
      });

      return result;
    } catch {
      // 🚨 CRITICAL FIX: Handle ```json code blocks properly
      let cleanContent = content;

      // Remove code block markers if present
      if (content.startsWith('```json\n') && content.endsWith('\n```')) {
        cleanContent = content.slice(8, -4); // Remove ```json\n from start and \n``` from end

        // Try parsing the cleaned content as JSON
        try {
          const parsed = JSON.parse(cleanContent);
          const result = {
            title: (parsed.title && parsed.title.trim()) || 'Generated Article',
            content: (parsed.content && parsed.content.trim()) || cleanContent || 'Article content generated by AutoGeorge AI.',
            rawResponse: parsed
          };

          console.log('🤖 [PerplexityService] Code block JSON parsed result:', {
            originalStarted: content.startsWith('```json'),
            cleanedContentLength: cleanContent.length,
            titleLength: result.title?.length || 0,
            contentLength: result.content?.length || 0,
            titlePreview: result.title?.substring(0, 50) || 'EMPTY',
            contentPreview: result.content?.substring(0, 100) || 'EMPTY'
          });

          return result;
        } catch (jsonError) {
          console.log('🚨 [PerplexityService] Failed to parse cleaned JSON, falling back to text parsing');
        }
      }

      // Final fallback: extract title from first line and use rest as content
      const lines = cleanContent.split('\n');
      const extractedTitle = lines[0].replace(/^#\s*/, '').trim();
      const title = extractedTitle || 'Generated Article';
      const articleContent = lines.slice(1).join('\n').trim();

      const result = {
        title: title.length >= 10 ? title : 'Generated Article - AutoGeorge AI',
        content: articleContent || cleanContent || 'Article content generated by AutoGeorge AI.',
        rawResponse: { title, content: articleContent, fallback: true }
      };

      console.log('🤖 [PerplexityService] Final fallback parsed result:', {
        linesCount: lines.length,
        firstLine: lines[0] || 'EMPTY',
        titleLength: result.title?.length || 0,
        contentLength: result.content?.length || 0,
        titlePreview: result.title?.substring(0, 50) || 'EMPTY',
        contentPreview: result.content?.substring(0, 100) || 'EMPTY'
      });

      return result;
    }
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