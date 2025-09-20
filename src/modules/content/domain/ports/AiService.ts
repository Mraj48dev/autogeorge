import { Result } from '../../../../shared/domain/types/Result';

/**
 * Port for AI content generation services.
 *
 * This interface abstracts the complexity of different AI providers
 * (OpenAI, Perplexity, Claude, etc.) behind a common contract.
 * The infrastructure layer will implement adapters for specific providers.
 *
 * Key principles:
 * - Provider-agnostic interface
 * - Supports different content generation models
 * - Returns structured results with metadata
 * - Handles rate limiting and error recovery
 * - Supports different generation modes (article, summary, SEO, etc.)
 */
export interface AiService {
  /**
   * Generates article content based on a prompt and configuration.
   *
   * @param request The content generation request
   * @returns Result containing generated content and metadata
   */
  generateArticle(request: ArticleGenerationRequest): Promise<Result<ArticleGenerationResult, AiServiceError>>;

  /**
   * Generates SEO metadata for existing content.
   *
   * @param request The SEO generation request
   * @returns Result containing SEO metadata
   */
  generateSeoMetadata(request: SeoGenerationRequest): Promise<Result<SeoGenerationResult, AiServiceError>>;

  /**
   * Generates a summary or excerpt of existing content.
   *
   * @param request The summary generation request
   * @returns Result containing the generated summary
   */
  generateSummary(request: SummaryGenerationRequest): Promise<Result<SummaryGenerationResult, AiServiceError>>;

  /**
   * Improves existing content (grammar, style, clarity).
   *
   * @param request The content improvement request
   * @returns Result containing improved content
   */
  improveContent(request: ContentImprovementRequest): Promise<Result<ContentImprovementResult, AiServiceError>>;

  /**
   * Validates that content meets quality standards.
   *
   * @param request The content validation request
   * @returns Result containing validation results and suggestions
   */
  validateContent(request: ContentValidationRequest): Promise<Result<ContentValidationResult, AiServiceError>>;

  /**
   * Checks the current service status and available models.
   *
   * @returns Result containing service health information
   */
  getServiceHealth(): Promise<Result<ServiceHealthInfo, AiServiceError>>;
}

/**
 * Request for generating article content
 */
export interface ArticleGenerationRequest {
  /** The prompt describing what content to generate */
  prompt: string;

  /** The AI model to use for generation */
  model: string;

  /** Optional source content to base the article on */
  sourceContent?: string;

  /** Target language for the content */
  language?: string;

  /** Desired tone (formal, casual, professional, etc.) */
  tone?: string;

  /** Writing style (news, blog, academic, etc.) */
  style?: string;

  /** Target audience description */
  targetAudience?: string;

  /** Desired length in words (approximate) */
  targetWordCount?: number;

  /** Keywords to include in the content */
  keywords?: string[];

  /** Generation parameters */
  parameters?: GenerationParameters;

  /** Request metadata for tracking */
  metadata?: RequestMetadata;
}

/**
 * Result of article content generation
 */
export interface ArticleGenerationResult {
  /** The generated article title */
  title: string;

  /** The generated article content */
  content: string;

  /** Format of the generated content (html, markdown, plain) */
  format: ContentFormat;

  /** Statistics about the generated content */
  statistics: ContentStatistics;

  /** The model used for generation */
  modelUsed: string;

  /** Generation metadata and performance info */
  metadata: GenerationMetadata;
}

/**
 * Request for generating SEO metadata
 */
export interface SeoGenerationRequest {
  /** The article title */
  title: string;

  /** The article content */
  content: string;

  /** Target keywords for SEO */
  targetKeywords?: string[];

  /** Target meta description length */
  metaDescriptionLength?: number;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Result of SEO metadata generation
 */
export interface SeoGenerationResult {
  /** SEO-optimized meta title */
  metaTitle: string;

  /** SEO meta description */
  metaDescription: string;

  /** Suggested focus keywords */
  focusKeywords: string[];

  /** Additional meta tags */
  metaTags: Record<string, string>;

  /** SEO score and recommendations */
  seoAnalysis: SeoAnalysis;

  /** Generation metadata */
  metadata: GenerationMetadata;
}

/**
 * Request for generating content summary
 */
export interface SummaryGenerationRequest {
  /** The content to summarize */
  content: string;

  /** Desired summary length */
  targetLength?: number;

  /** Summary type (excerpt, abstract, bullet-points) */
  summaryType?: SummaryType;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Result of summary generation
 */
export interface SummaryGenerationResult {
  /** The generated summary */
  summary: string;

  /** Type of summary generated */
  summaryType: SummaryType;

  /** Summary statistics */
  statistics: ContentStatistics;

  /** Generation metadata */
  metadata: GenerationMetadata;
}

/**
 * Request for content improvement
 */
export interface ContentImprovementRequest {
  /** The content to improve */
  content: string;

  /** Areas to focus on for improvement */
  improvementAreas?: ImprovementArea[];

  /** Target tone for the improved content */
  targetTone?: string;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Result of content improvement
 */
export interface ContentImprovementResult {
  /** The improved content */
  improvedContent: string;

  /** List of changes made */
  changesApplied: ContentChange[];

  /** Quality score comparison */
  qualityComparison: QualityComparison;

  /** Generation metadata */
  metadata: GenerationMetadata;
}

/**
 * Request for content validation
 */
export interface ContentValidationRequest {
  /** The content to validate */
  content: string;

  /** Validation criteria */
  criteria?: ValidationCriteria;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Result of content validation
 */
export interface ContentValidationResult {
  /** Overall validation score (0-100) */
  overallScore: number;

  /** Detailed validation results by category */
  validationResults: ValidationCategory[];

  /** Suggestions for improvement */
  suggestions: ValidationSuggestion[];

  /** Content meets minimum quality standards */
  isValid: boolean;

  /** Generation metadata */
  metadata: GenerationMetadata;
}

/**
 * AI generation parameters
 */
export interface GenerationParameters {
  /** Temperature for randomness (0.0-2.0) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Top-p sampling parameter */
  topP?: number;

  /** Frequency penalty */
  frequencyPenalty?: number;

  /** Presence penalty */
  presencePenalty?: number;

  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * Request metadata for tracking and debugging
 */
export interface RequestMetadata {
  /** Unique request ID for tracking */
  requestId: string;

  /** User ID making the request */
  userId?: string;

  /** Source that triggered the generation */
  sourceId?: string;

  /** Request priority (1-10) */
  priority?: number;

  /** Additional context information */
  context?: Record<string, any>;
}

/**
 * Generation metadata returned with results
 */
export interface GenerationMetadata {
  /** Time taken for generation (ms) */
  generationTime: number;

  /** Tokens consumed in the request */
  tokensUsed: number;

  /** Cost of the generation (in credits/tokens) */
  cost?: number;

  /** Provider used for generation */
  provider: string;

  /** Model version used */
  modelVersion: string;

  /** Timestamp of generation */
  timestamp: Date;

  /** Request ID for correlation */
  requestId: string;
}

/**
 * Content statistics
 */
export interface ContentStatistics {
  /** Character count */
  characterCount: number;

  /** Word count */
  wordCount: number;

  /** Sentence count */
  sentenceCount: number;

  /** Paragraph count */
  paragraphCount: number;

  /** Reading time estimate (minutes) */
  readingTime: number;

  /** Readability score */
  readabilityScore?: number;
}

/**
 * Service health information
 */
export interface ServiceHealthInfo {
  /** Service is operational */
  isHealthy: boolean;

  /** Available models */
  availableModels: ModelInfo[];

  /** Current rate limits */
  rateLimits: RateLimitInfo;

  /** Service uptime */
  uptime: number;

  /** Last health check timestamp */
  lastChecked: Date;
}

/**
 * AI model information
 */
export interface ModelInfo {
  /** Model identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Model description */
  description: string;

  /** Supported content types */
  supportedContentTypes: ContentType[];

  /** Maximum context length */
  maxContextLength: number;

  /** Cost per 1K tokens */
  costPer1kTokens?: number;

  /** Model is currently available */
  isAvailable: boolean;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Requests per minute allowed */
  requestsPerMinute: number;

  /** Tokens per minute allowed */
  tokensPerMinute: number;

  /** Current usage counts */
  currentUsage: {
    requests: number;
    tokens: number;
  };

  /** Time until reset (seconds) */
  resetTime: number;
}

// Enums and types
export type ContentFormat = 'html' | 'markdown' | 'plain';
export type SummaryType = 'excerpt' | 'abstract' | 'bullet-points' | 'key-takeaways';
export type ImprovementArea = 'grammar' | 'clarity' | 'tone' | 'structure' | 'engagement' | 'seo';
export type ContentType = 'article' | 'blog-post' | 'news' | 'academic' | 'marketing' | 'social-media';

export interface SeoAnalysis {
  score: number;
  recommendations: string[];
  keywordDensity: Record<string, number>;
  readabilityScore: number;
}

export interface ContentChange {
  type: ImprovementArea;
  description: string;
  originalText?: string;
  improvedText?: string;
}

export interface QualityComparison {
  originalScore: number;
  improvedScore: number;
  improvements: string[];
}

export interface ValidationCriteria {
  minWordCount?: number;
  maxWordCount?: number;
  requiredKeywords?: string[];
  forbiddenTerms?: string[];
  targetReadabilityScore?: number;
}

export interface ValidationCategory {
  name: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface ValidationSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  impact: string;
}

/**
 * AI service specific errors
 */
export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AiServiceErrorCode,
    public readonly provider?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AiServiceError';
  }

  static rateLimitExceeded(provider: string): AiServiceError {
    return new AiServiceError(
      `Rate limit exceeded for provider ${provider}`,
      'RATE_LIMIT_EXCEEDED',
      provider
    );
  }

  static modelUnavailable(model: string, provider: string): AiServiceError {
    return new AiServiceError(
      `Model ${model} is not available on provider ${provider}`,
      'MODEL_UNAVAILABLE',
      provider
    );
  }

  static contentFiltered(reason: string): AiServiceError {
    return new AiServiceError(
      `Content was filtered: ${reason}`,
      'CONTENT_FILTERED'
    );
  }

  static tokenLimitExceeded(limit: number): AiServiceError {
    return new AiServiceError(
      `Token limit of ${limit} exceeded`,
      'TOKEN_LIMIT_EXCEEDED'
    );
  }

  static authenticationFailed(provider: string): AiServiceError {
    return new AiServiceError(
      `Authentication failed for provider ${provider}`,
      'AUTHENTICATION_FAILED',
      provider
    );
  }

  static serviceUnavailable(provider: string): AiServiceError {
    return new AiServiceError(
      `Service unavailable for provider ${provider}`,
      'SERVICE_UNAVAILABLE',
      provider
    );
  }
}

export type AiServiceErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'MODEL_UNAVAILABLE'
  | 'CONTENT_FILTERED'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'AUTHENTICATION_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';