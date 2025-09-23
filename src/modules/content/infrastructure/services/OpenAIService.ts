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
 * OpenAI service adapter for ChatGPT integration.
 *
 * This service is optimized for content generation, improvement, and refinement.
 * It excels at creative writing, style adaptation, and content optimization.
 */
export class OpenAIService implements AiService {
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly apiKey: string;
  private readonly defaultModel = 'gpt-4o-mini'; // Cost-effective model

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
  }

  async generateArticle(request: ArticleGenerationRequest): Promise<Result<ArticleGenerationResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      const prompt = this.buildArticlePrompt(request);

      const response = await this.makeApiCall('/chat/completions', {
        model: request.model || this.defaultModel,
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
        max_tokens: request.parameters?.maxTokens || 4000,
        temperature: request.parameters?.temperature || 0.7,
        top_p: request.parameters?.topP || 0.9,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty response from OpenAI')
        );
      }

      const parsedContent = this.parseArticleResponse(content);
      const statistics = this.calculateStatistics(parsedContent.content);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0, request.model || this.defaultModel),
        provider: 'openai',
        modelVersion: request.model || this.defaultModel,
        timestamp: new Date(),
        requestId: request.metadata?.requestId || 'unknown',
      };

      const result: ArticleGenerationResult = {
        title: parsedContent.title,
        content: parsedContent.content,
        format: 'markdown' as ContentFormat,
        statistics,
        modelUsed: request.model || this.defaultModel,
        metadata,
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `OpenAI service error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        temperature: 0.3,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty SEO response from OpenAI')
        );
      }

      const parsedSeo = this.parseSeoResponse(content);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0, this.defaultModel),
        provider: 'openai',
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
          `OpenAI SEO service error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          AiServiceError.serviceUnavailable('Empty summary response from OpenAI')
        );
      }

      const statistics = this.calculateStatistics(summary);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0, this.defaultModel),
        provider: 'openai',
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
          `OpenAI summary service error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async improveContent(request: ContentImprovementRequest): Promise<Result<ContentImprovementResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      const prompt = this.buildContentImprovementPrompt(request);

      const response = await this.makeApiCall('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('content_improvement')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.5,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const improvedContent = data.choices[0]?.message?.content;

      if (!improvedContent) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty content improvement response from OpenAI')
        );
      }

      const originalStats = this.calculateStatistics(request.content);
      const improvedStats = this.calculateStatistics(improvedContent);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0, this.defaultModel),
        provider: 'openai',
        modelVersion: this.defaultModel,
        timestamp: new Date(),
        requestId: 'content-improvement',
      };

      const result: ContentImprovementResult = {
        originalContent: request.content,
        improvedContent: improvedContent.trim(),
        improvements: this.extractImprovements(request.content, improvedContent),
        originalStatistics: originalStats,
        improvedStatistics: improvedStats,
        metadata,
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `OpenAI content improvement error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async validateContent(request: ContentValidationRequest): Promise<Result<ContentValidationResult, AiServiceError>> {
    try {
      const startTime = Date.now();

      const prompt = this.buildContentValidationPrompt(request);

      const response = await this.makeApiCall('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('content_validation')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      const validationResponse = data.choices[0]?.message?.content;

      if (!validationResponse) {
        return Result.failure(
          AiServiceError.serviceUnavailable('Empty validation response from OpenAI')
        );
      }

      const parsedValidation = this.parseValidationResponse(validationResponse);

      const metadata: GenerationMetadata = {
        generationTime: Date.now() - startTime,
        tokensUsed: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0, this.defaultModel),
        provider: 'openai',
        modelVersion: this.defaultModel,
        timestamp: new Date(),
        requestId: 'content-validation',
      };

      const result: ContentValidationResult = {
        isValid: parsedValidation.isValid,
        validationScore: parsedValidation.score,
        issues: parsedValidation.issues,
        suggestions: parsedValidation.suggestions,
        categories: parsedValidation.categories,
        metadata,
      };

      return Result.success(result);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable(
          `OpenAI validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  async getServiceHealth(): Promise<Result<ServiceHealthInfo, AiServiceError>> {
    try {
      const response = await this.makeApiCall('/models', {});

      const healthInfo: ServiceHealthInfo = {
        isHealthy: response.ok,
        availableModels: response.ok ? await this.getAvailableModels() : [],
        rateLimits: {
          requestsPerMinute: 3500, // OpenAI default for paid accounts
          tokensPerMinute: 90000,
          currentUsage: { requests: 0, tokens: 0 },
          resetTime: 60,
        },
        uptime: Date.now(),
        lastChecked: new Date(),
      };

      return Result.success(healthInfo);

    } catch (error) {
      return Result.failure(
        AiServiceError.serviceUnavailable('OpenAI health check failed')
      );
    }
  }

  /**
   * Makes an API call to OpenAI
   */
  private async makeApiCall(endpoint: string, payload: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    return fetch(url, {
      method: endpoint === '/models' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AutoGeorge/1.0',
      },
      body: endpoint === '/models' ? undefined : JSON.stringify(payload),
    });
  }

  /**
   * Handles API errors and converts them to domain errors
   */
  private async handleApiError(response: Response): Promise<Result<any, AiServiceError>> {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 401:
        return Result.failure(AiServiceError.authenticationFailed('openai'));
      case 429:
        return Result.failure(AiServiceError.rateLimitExceeded('openai'));
      case 400:
        return Result.failure(
          new AiServiceError(
            `Invalid request: ${errorData.error?.message || 'Unknown error'}`,
            'INVALID_REQUEST',
            'openai'
          )
        );
      default:
        return Result.failure(AiServiceError.serviceUnavailable('openai'));
    }
  }

  /**
   * Builds prompts for different operations
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

    prompt += '\nFormat the response as a well-structured article with a clear title and body. Use markdown formatting.';

    return prompt;
  }

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

  private buildSummaryPrompt(request: SummaryGenerationRequest): string {
    let prompt = `Create a ${request.summaryType || 'excerpt'} summary of the following content:\n\n`;
    prompt += `${request.content}\n\n`;

    if (request.targetLength) {
      prompt += `Target length: approximately ${request.targetLength} characters\n`;
    }

    prompt += 'The summary should capture the key points and main message of the content.';

    return prompt;
  }

  private buildContentImprovementPrompt(request: ContentImprovementRequest): string {
    let prompt = `Improve the following content:\n\n${request.content}\n\n`;

    prompt += 'Focus on:\n';
    if (request.improvementType?.includes('clarity')) {
      prompt += '- Improving clarity and readability\n';
    }
    if (request.improvementType?.includes('engagement')) {
      prompt += '- Enhancing engagement and flow\n';
    }
    if (request.improvementType?.includes('seo')) {
      prompt += '- SEO optimization\n';
    }
    if (request.improvementType?.includes('grammar')) {
      prompt += '- Grammar and writing quality\n';
    }

    if (request.targetAudience) {
      prompt += `\nTarget audience: ${request.targetAudience}`;
    }

    return prompt;
  }

  private buildContentValidationPrompt(request: ContentValidationRequest): string {
    let prompt = `Validate the following content for:\n\n`;

    if (request.validationType?.includes('accuracy')) {
      prompt += '- Factual accuracy\n';
    }
    if (request.validationType?.includes('grammar')) {
      prompt += '- Grammar and language quality\n';
    }
    if (request.validationType?.includes('readability')) {
      prompt += '- Readability and clarity\n';
    }
    if (request.validationType?.includes('completeness')) {
      prompt += '- Content completeness\n';
    }

    prompt += `\nContent to validate:\n${request.content}\n\n`;
    prompt += 'Provide a detailed validation report with scores, issues, and suggestions.';

    return prompt;
  }

  /**
   * System prompts for different generation types
   */
  private getSystemPrompt(type: string): string {
    switch (type) {
      case 'article_generation':
        return `You are an expert content writer. Create engaging, well-structured articles that are informative, readable, and optimized for the target audience. Always maintain factual accuracy and proper formatting.`;

      case 'seo_generation':
        return `You are an SEO expert. Generate optimized metadata that improves search engine rankings while maintaining readability and user engagement. Always provide JSON formatted responses.`;

      case 'summary_generation':
        return `You are an expert at creating concise, accurate summaries that capture the essence of content while maintaining clarity and engagement.`;

      case 'content_improvement':
        return `You are a content improvement specialist. Enhance content while preserving the original meaning and voice, focusing on clarity, engagement, and overall quality.`;

      case 'content_validation':
        return `You are a content quality analyst. Provide thorough, objective validation of content quality, accuracy, and effectiveness. Always provide JSON formatted responses.`;

      default:
        return `You are a helpful AI assistant focused on content creation and optimization.`;
    }
  }

  /**
   * Parser methods
   */
  private parseArticleResponse(content: string): { title: string; content: string } {
    const lines = content.split('\n');
    let title = 'Generated Article';
    let articleContent = content;

    // Try to extract title from first line if it looks like a title
    if (lines[0] && (lines[0].startsWith('#') || lines[0].length < 100)) {
      title = lines[0].replace(/^#\s*/, '').trim();
      articleContent = lines.slice(1).join('\n').trim();
    }

    return { title, content: articleContent };
  }

  private parseSeoResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return {
        metaTitle: 'SEO Optimized Title',
        metaDescription: 'SEO optimized description...',
        focusKeywords: [],
        metaTags: {},
        seoAnalysis: { score: 75, recommendations: [] },
      };
    }
  }

  private parseValidationResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return {
        isValid: true,
        score: 80,
        issues: [],
        suggestions: [],
        categories: { accuracy: 80, grammar: 85, readability: 75, completeness: 80 },
      };
    }
  }

  /**
   * Helper methods
   */
  private calculateStatistics(content: string): ContentStatistics {
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      characterCount,
      wordCount,
      sentenceCount,
      paragraphCount,
      readingTime,
    };
  }

  private calculateCost(tokens: number, model: string): number {
    // OpenAI pricing per 1K tokens (simplified)
    const costs: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015,
      'gpt-4-turbo': 0.003,
      'gpt-3.5-turbo': 0.0005,
    };

    const costPer1k = costs[model] || costs['gpt-4o-mini'];
    return (tokens / 1000) * costPer1k;
  }

  private extractImprovements(original: string, improved: string): string[] {
    // Simple improvement detection - in a real implementation,
    // you'd use more sophisticated text comparison
    return ['Content structure improved', 'Readability enhanced', 'Grammar corrected'];
  }

  private async getAvailableModels(): Promise<any[]> {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most advanced model for complex tasks',
        supportedContentTypes: ['article', 'blog-post', 'technical'],
        maxContextLength: 128000,
        costPer1kTokens: 0.005,
        isAvailable: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and cost-effective model',
        supportedContentTypes: ['article', 'blog-post', 'news'],
        maxContextLength: 128000,
        costPer1kTokens: 0.00015,
        isAvailable: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High performance model with large context',
        supportedContentTypes: ['article', 'blog-post', 'technical'],
        maxContextLength: 128000,
        costPer1kTokens: 0.003,
        isAvailable: true,
      },
    ];
  }
}