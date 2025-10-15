/**
 * Dependency Injection Container for AutoGeorge.
 *
 * This is the composition root where all dependencies are wired together.
 * It follows the principle of "pure DI" without a heavyweight framework,
 * keeping the wiring explicit and easy to understand.
 *
 * Key principles:
 * - Single place for all dependency configuration
 * - No magic or reflection - all wiring is explicit
 * - Environment-aware configuration
 * - Lazy loading of expensive resources
 * - Proper lifecycle management
 * - Easy testing with mock implementations
 *
 * The container is organized by modules to maintain clear boundaries
 * and make it easy to understand which dependencies belong to which module.
 */
import { PrismaClient } from '@prisma/client';

// Shared Infrastructure
import { Logger } from '../shared/infrastructure/monitoring/Logger';

// Content Module
import { ArticleRepository } from '../modules/content/domain/ports/ArticleRepository';
import { AiService } from '../modules/content/domain/ports/AiService';
import { PrismaArticleRepository } from '../modules/content/infrastructure/repositories/PrismaArticleRepository';
import { PerplexityService } from '../modules/content/infrastructure/services/PerplexityService';
import { GenerateArticle } from '../modules/content/application/use-cases/GenerateArticle';
import { ContentAdminFacade } from '../modules/content/admin/ContentAdminFacade';

// PromptEngineer Module
import { IPromptEngineeringService } from '../modules/prompt-engineer/application/ports/IPromptEngineeringService';
import { IImagePromptRepository } from '../modules/prompt-engineer/application/ports/IImagePromptRepository';
import { ChatGptPromptService } from '../modules/prompt-engineer/infrastructure/ChatGptPromptService';
import { PrismaImagePromptRepository } from '../modules/prompt-engineer/infrastructure/PrismaImagePromptRepository';
import { GenerateImagePrompt } from '../modules/prompt-engineer/application/use-cases/GenerateImagePrompt';
import { ValidateImagePrompt } from '../modules/prompt-engineer/application/use-cases/ValidateImagePrompt';
import { PromptEngineerFacade } from '../modules/prompt-engineer/admin/PromptEngineerFacade';

// Auth Module
import { AuthService } from '../modules/auth/domain';
import { MockAuthService } from '../modules/auth/infrastructure';

// Automation Module REMOVED - Architecture simplified

// Configuration
import { Config } from '../shared/config/env';

/**
 * Main dependency injection container
 */
export class Container {
  private static instance: Container;
  private _config: Config;
  private _prisma: PrismaClient | null = null;
  private _logger: Logger | null = null;

  // Content module dependencies
  private _articleRepository: ArticleRepository | null = null;
  private _aiService: AiService | null = null;
  private _generateArticle: GenerateArticle | null = null;
  private _contentAdminFacade: ContentAdminFacade | null = null;

  // PromptEngineer module dependencies
  private _promptEngineeringService: IPromptEngineeringService | null = null;
  private _imagePromptRepository: IImagePromptRepository | null = null;
  private _generateImagePrompt: GenerateImagePrompt | null = null;
  private _validateImagePrompt: ValidateImagePrompt | null = null;
  private _promptEngineerFacade: PromptEngineerFacade | null = null;

  // Auth module dependencies
  private _authService: AuthService | null = null;

  // Automation module REMOVED - Simplified architecture

  private constructor(config: Config) {
    this._config = config;
  }

  /**
   * Gets the singleton container instance
   */
  static getInstance(config?: Config): Container {
    if (!Container.instance) {
      if (!config) {
        throw new Error('Config is required for first container initialization');
      }
      Container.instance = new Container(config);
    }
    return Container.instance;
  }

  /**
   * Resets the container (useful for testing)
   */
  static reset(): void {
    Container.instance = null as any;
  }

  // =============================================
  // Shared Infrastructure Dependencies
  // =============================================

  get config(): Config {
    return this._config;
  }

  get prisma(): PrismaClient {
    if (!this._prisma) {
      this._prisma = new PrismaClient({
        datasources: {
          db: {
            url: this._config.database.url,
          },
        },
        log: this._config.database.enableLogging
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      });

      // Setup connection lifecycle
      this._prisma.$connect().catch((error) => {
        this.logger.error('Failed to connect to database', { error });
        throw error;
      });
    }
    return this._prisma;
  }

  get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger({
        level: this._config.app.logLevel,
        environment: this._config.app.env,
        serviceName: 'autogeorge',
      });
    }
    return this._logger;
  }

  // =============================================
  // Content Module Dependencies
  // =============================================

  get articleRepository(): ArticleRepository {
    if (!this._articleRepository) {
      this._articleRepository = new PrismaArticleRepository(this.prisma);
    }
    return this._articleRepository;
  }

  get aiService(): AiService {
    if (!this._aiService) {
      // For now, we're using Perplexity as the primary AI service
      // In a full implementation, you might have a factory that chooses
      // between different providers based on configuration
      this._aiService = new PerplexityService(this._config.ai.perplexityApiKey);
    }
    return this._aiService;
  }

  get generateArticle(): GenerateArticle {
    if (!this._generateArticle) {
      this._generateArticle = new GenerateArticle(
        this.articleRepository,
        this.aiService
      );
    }
    return this._generateArticle;
  }

  get contentAdminFacade(): ContentAdminFacade {
    if (!this._contentAdminFacade) {
      this._contentAdminFacade = new ContentAdminFacade(
        this.generateArticle
      );
    }
    return this._contentAdminFacade;
  }

  // =============================================
  // PromptEngineer Module Dependencies
  // =============================================

  get promptEngineeringService(): IPromptEngineeringService {
    if (!this._promptEngineeringService) {
      if (!this._config.ai.openaiApiKey) {
        throw new Error('OpenAI API key is required for prompt engineering service');
      }
      this._promptEngineeringService = new ChatGptPromptService(this._config.ai.openaiApiKey);
    }
    return this._promptEngineeringService;
  }

  get imagePromptRepository(): IImagePromptRepository {
    if (!this._imagePromptRepository) {
      this._imagePromptRepository = new PrismaImagePromptRepository();
    }
    return this._imagePromptRepository;
  }

  get generateImagePrompt(): GenerateImagePrompt {
    if (!this._generateImagePrompt) {
      this._generateImagePrompt = new GenerateImagePrompt(
        this.promptEngineeringService,
        this.imagePromptRepository
      );
    }
    return this._generateImagePrompt;
  }

  get validateImagePrompt(): ValidateImagePrompt {
    if (!this._validateImagePrompt) {
      this._validateImagePrompt = new ValidateImagePrompt(
        this.imagePromptRepository
      );
    }
    return this._validateImagePrompt;
  }

  get promptEngineerFacade(): PromptEngineerFacade {
    if (!this._promptEngineerFacade) {
      this._promptEngineerFacade = new PromptEngineerFacade(
        this.generateImagePrompt,
        this.validateImagePrompt
      );
    }
    return this._promptEngineerFacade;
  }

  // =============================================
  // Auth Module Dependencies
  // =============================================

  get authService(): AuthService {
    if (!this._authService) {
      // For now using MockAuthService, can be easily switched to NextAuth or Clerk
      this._authService = new MockAuthService();
    }
    return this._authService;
  }

  // =============================================
  // Automation Module REMOVED - Simplified architecture
  // =============================================

  // =============================================
  // Lifecycle Management
  // =============================================

  /**
   * Initializes all critical dependencies
   * Should be called during application startup
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing container dependencies...');

      // Initialize database connection
      await this.prisma.$connect();
      this.logger.info('Database connection established');

      // Validate AI service configuration
      const healthResult = await this.aiService.getServiceHealth();
      if (healthResult.isSuccess() && healthResult.value.isHealthy) {
        this.logger.info('AI service is healthy');
      } else {
        this.logger.warn('AI service health check failed', {
          error: healthResult.isFailure() ? healthResult.error.message : 'Unknown error'
        });
      }

      // Event bus and automation handlers REMOVED - simplified architecture

      this.logger.info('Container initialization completed successfully');
    } catch (error) {
      this.logger.error('Container initialization failed', { error });
      throw error;
    }
  }

  /**
   * Gracefully shuts down all resources
   * Should be called during application shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down container dependencies...');

      // Close database connections
      if (this._prisma) {
        await this._prisma.$disconnect();
        this.logger.info('Database connection closed');
      }

      // Flush any pending logs
      if (this._logger) {
        await this._logger.flush();
      }

      this.logger.info('Container shutdown completed successfully');
    } catch (error) {
      console.error('Error during container shutdown:', error);
      throw error;
    }
  }

  /**
   * Health check for all critical dependencies
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = [];

    // Database health check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({
        name: 'database',
        status: 'healthy',
        timestamp: new Date(),
      });
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }

    // AI service health check
    try {
      const healthResult = await this.aiService.getServiceHealth();
      checks.push({
        name: 'ai_service',
        status: healthResult.isSuccess() && healthResult.value.isHealthy ? 'healthy' : 'unhealthy',
        error: healthResult.isFailure() ? healthResult.error.message : undefined,
        timestamp: new Date(),
      });
    } catch (error) {
      checks.push({
        name: 'ai_service',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }

    // Auth service health check
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      checks.push({
        name: 'auth_service',
        status: 'healthy', // AuthService is always considered healthy if it responds
        timestamp: new Date(),
      });
    } catch (error) {
      checks.push({
        name: 'auth_service',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }

    const isHealthy = checks.every(check => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date(),
    };
  }

  /**
   * Creates a container with mock dependencies for testing
   */
  static createTestContainer(mocks: Partial<TestMocks> = {}): Container {
    const testConfig = Config.createTestConfig();
    const container = new Container(testConfig);

    // Override with mocks
    if (mocks.articleRepository) {
      container._articleRepository = mocks.articleRepository;
    }
    if (mocks.aiService) {
      container._aiService = mocks.aiService;
    }
    if (mocks.authService) {
      container._authService = mocks.authService;
    }
    if (mocks.logger) {
      container._logger = mocks.logger;
    }

    return container;
  }
}

// =============================================
// Type Definitions
// =============================================

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  error?: string;
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
}

export interface TestMocks {
  articleRepository: ArticleRepository;
  aiService: AiService;
  authService: AuthService;
  logger: Logger;
}

/**
 * Factory function to create a container with environment-specific configuration
 */
export function createContainer(): Container {
  const config = Config.fromEnvironment();
  return Container.getInstance(config);
}

/**
 * Gets the current container instance
 * Throws error if container hasn't been initialized
 */
export function getContainer(): Container {
  const instance = Container.getInstance();
  if (!instance) {
    throw new Error('Container not initialized. Call createContainer() first.');
  }
  return instance;
}