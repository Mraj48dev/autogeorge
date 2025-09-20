import { CommandUseCase, ExecutionContext } from '../../shared/application/base/UseCase';
import { Result } from '../../shared/domain/types/Result';
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { AiService, ArticleGenerationRequest } from '../../domain/ports/AiService';
import { Article, GenerationParameters } from '../../domain/entities/Article';
import { Title } from '../../domain/value-objects/Title';
import { Content } from '../../domain/value-objects/Content';
import { ArticleId } from '../../domain/value-objects/ArticleId';

/**
 * Use Case for generating articles using AI services.
 *
 * This use case orchestrates the article generation process:
 * 1. Validates the generation request
 * 2. Calls the appropriate AI service
 * 3. Creates the domain entity
 * 4. Persists the generated article
 * 5. Returns the result with metadata
 *
 * Business Rules:
 * - User must have sufficient tokens for generation
 * - Prompt must meet minimum quality standards
 * - Generated content must pass validation
 * - Articles are created in 'generated' status
 * - Source information is tracked for auditing
 */
export class GenerateArticle extends CommandUseCase<
  GenerateArticleInput,
  GenerateArticleOutput,
  GenerateArticleError
> {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly aiService: AiService
  ) {
    super();
  }

  protected async validateInput(
    input: GenerateArticleInput
  ): Promise<Result<GenerateArticleInput, GenerateArticleError>> {
    // Validate prompt
    if (!input.prompt || input.prompt.trim().length < 10) {
      return Result.failure(
        GenerateArticleError.invalidPrompt('Prompt must be at least 10 characters long')
      );
    }

    if (input.prompt.length > 5000) {
      return Result.failure(
        GenerateArticleError.invalidPrompt('Prompt cannot exceed 5000 characters')
      );
    }

    // Validate model
    if (!input.model || input.model.trim().length === 0) {
      return Result.failure(
        GenerateArticleError.invalidModel('Model must be specified')
      );
    }

    // Validate optional parameters
    if (input.targetWordCount && (input.targetWordCount < 100 || input.targetWordCount > 10000)) {
      return Result.failure(
        GenerateArticleError.invalidParameters('Target word count must be between 100 and 10,000')
      );
    }

    if (input.temperature && (input.temperature < 0 || input.temperature > 2)) {
      return Result.failure(
        GenerateArticleError.invalidParameters('Temperature must be between 0 and 2')
      );
    }

    return Result.success(input);
  }

  protected async executeCommand(
    input: GenerateArticleInput,
    context: ExecutionContext
  ): Promise<Result<GenerateArticleOutput, GenerateArticleError>> {
    try {
      // Step 1: Prepare AI generation request
      const aiRequest = this.buildAiRequest(input, context);

      // Step 2: Generate content using AI service
      const aiResult = await this.aiService.generateArticle(aiRequest);
      if (aiResult.isFailure()) {
        return Result.failure(
          GenerateArticleError.generationFailed(aiResult.error.message)
        );
      }

      const generatedContent = aiResult.value;

      // Step 3: Create domain entities from generated content
      const titleResult = this.createTitle(generatedContent.title);
      if (titleResult.isFailure()) {
        return Result.failure(titleResult.error);
      }

      const contentResult = this.createContent(generatedContent.content);
      if (contentResult.isFailure()) {
        return Result.failure(contentResult.error);
      }

      // Step 4: Create article entity
      const generationParams: GenerationParameters = {
        prompt: input.prompt,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        language: input.language,
        tone: input.tone,
        style: input.style,
        targetAudience: input.targetAudience,
      };

      const article = Article.createGenerated(
        titleResult.value,
        contentResult.value,
        input.sourceId || 'manual',
        generationParams
      );

      // Step 5: Save the article
      const saveResult = await this.articleRepository.save(article);
      if (saveResult.isFailure()) {
        return Result.failure(
          GenerateArticleError.persistenceFailed(saveResult.error.message)
        );
      }

      // Step 6: Build and return success result
      const output: GenerateArticleOutput = {
        articleId: article.id.getValue(),
        title: titleResult.value.getValue(),
        content: contentResult.value.getValue(),
        wordCount: generatedContent.statistics.wordCount,
        estimatedReadingTime: contentResult.value.getEstimatedReadingTime(),
        status: article.status.getValue(),
        generationMetadata: {
          tokensUsed: generatedContent.metadata.tokensUsed,
          generationTime: generatedContent.metadata.generationTime,
          modelUsed: generatedContent.modelUsed,
          provider: generatedContent.metadata.provider,
          cost: generatedContent.metadata.cost,
        },
        createdAt: article.createdAt,
      };

      return Result.success(output);

    } catch (error) {
      return Result.failure(
        GenerateArticleError.unexpectedError(error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Builds the AI service request from the use case input
   */
  private buildAiRequest(
    input: GenerateArticleInput,
    context: ExecutionContext
  ): ArticleGenerationRequest {
    return {
      prompt: input.prompt,
      model: input.model,
      sourceContent: input.sourceContent,
      language: input.language || 'en',
      tone: input.tone,
      style: input.style,
      targetAudience: input.targetAudience,
      targetWordCount: input.targetWordCount,
      keywords: input.keywords,
      parameters: {
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        topP: input.topP,
        frequencyPenalty: input.frequencyPenalty,
        presencePenalty: input.presencePenalty,
      },
      metadata: {
        requestId: context.requestId || 'unknown',
        userId: context.userId,
        sourceId: input.sourceId,
        priority: 5, // Normal priority
        context: {
          userAgent: context.userAgent,
          correlationId: context.correlationId,
        },
      },
    };
  }

  /**
   * Creates a Title value object from generated title string
   */
  private createTitle(titleString: string): Result<Title, GenerateArticleError> {
    try {
      const title = new Title(titleString);
      return Result.success(title);
    } catch (error) {
      return Result.failure(
        GenerateArticleError.invalidGeneratedContent(
          `Generated title is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Creates a Content value object from generated content string
   */
  private createContent(contentString: string): Result<Content, GenerateArticleError> {
    try {
      const content = new Content(contentString);
      return Result.success(content);
    } catch (error) {
      return Result.failure(
        GenerateArticleError.invalidGeneratedContent(
          `Generated content is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Checks idempotency for article generation
   * If the same prompt and parameters were used recently, return the existing article
   */
  protected async checkIdempotency(
    input: GenerateArticleInput,
    context: ExecutionContext
  ): Promise<Result<GenerateArticleOutput | null, GenerateArticleError>> {
    if (!context.idempotencyKey) {
      return Result.success(null);
    }

    // In a real implementation, you would check a cache or database
    // for previously generated articles with the same idempotency key
    // For now, we'll return null (no cached result)
    return Result.success(null);
  }
}

/**
 * Input for the GenerateArticle use case
 */
export interface GenerateArticleInput {
  /** The prompt describing what content to generate */
  prompt: string;

  /** The AI model to use for generation */
  model: string;

  /** Optional source ID that triggered this generation */
  sourceId?: string;

  /** Optional source content to base the article on */
  sourceContent?: string;

  /** Target language for the content (default: 'en') */
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

  // AI Generation parameters
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
}

/**
 * Output from the GenerateArticle use case
 */
export interface GenerateArticleOutput {
  /** The ID of the generated article */
  articleId: string;

  /** The generated title */
  title: string;

  /** The generated content */
  content: string;

  /** Word count of the generated content */
  wordCount: number;

  /** Estimated reading time in minutes */
  estimatedReadingTime: number;

  /** Current status of the article */
  status: string;

  /** Metadata about the generation process */
  generationMetadata: {
    tokensUsed: number;
    generationTime: number;
    modelUsed: string;
    provider: string;
    cost?: number;
  };

  /** When the article was created */
  createdAt: Date;
}

/**
 * Errors specific to article generation
 */
export class GenerateArticleError extends Error {
  constructor(
    message: string,
    public readonly code: GenerateArticleErrorCode
  ) {
    super(message);
    this.name = 'GenerateArticleError';
  }

  static invalidPrompt(message: string): GenerateArticleError {
    return new GenerateArticleError(message, 'INVALID_PROMPT');
  }

  static invalidModel(message: string): GenerateArticleError {
    return new GenerateArticleError(message, 'INVALID_MODEL');
  }

  static invalidParameters(message: string): GenerateArticleError {
    return new GenerateArticleError(message, 'INVALID_PARAMETERS');
  }

  static generationFailed(message: string): GenerateArticleError {
    return new GenerateArticleError(
      `Article generation failed: ${message}`,
      'GENERATION_FAILED'
    );
  }

  static invalidGeneratedContent(message: string): GenerateArticleError {
    return new GenerateArticleError(message, 'INVALID_GENERATED_CONTENT');
  }

  static persistenceFailed(message: string): GenerateArticleError {
    return new GenerateArticleError(
      `Failed to save article: ${message}`,
      'PERSISTENCE_FAILED'
    );
  }

  static insufficientTokens(): GenerateArticleError {
    return new GenerateArticleError(
      'Insufficient tokens to generate article',
      'INSUFFICIENT_TOKENS'
    );
  }

  static unexpectedError(message: string): GenerateArticleError {
    return new GenerateArticleError(
      `Unexpected error: ${message}`,
      'UNEXPECTED_ERROR'
    );
  }
}

export type GenerateArticleErrorCode =
  | 'INVALID_PROMPT'
  | 'INVALID_MODEL'
  | 'INVALID_PARAMETERS'
  | 'GENERATION_FAILED'
  | 'INVALID_GENERATED_CONTENT'
  | 'PERSISTENCE_FAILED'
  | 'INSUFFICIENT_TOKENS'
  | 'UNEXPECTED_ERROR';