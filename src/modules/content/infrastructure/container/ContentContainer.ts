/**
 * Dependency Injection Container for Content Module - completely independent.
 *
 * This container is specific to the content module and has no dependencies
 * on global shared infrastructure or other modules.
 *
 * Key principles:
 * - Module-specific dependency configuration
 * - No external module dependencies
 * - Environment-aware configuration
 * - Easy testing with mock implementations
 */
import { PrismaClient } from '@prisma/client';

// Content Module Dependencies
import { ArticleRepository } from '../../domain/ports/ArticleRepository';
import { AiService } from '../../domain/ports/AiService';
import { GenerationSettingsRepository } from '../../domain/ports/GenerationSettingsRepository';
import { PrismaArticleRepository } from '../repositories/PrismaArticleRepository';
import { PrismaGenerationSettingsRepository } from '../repositories/PrismaGenerationSettingsRepository';
import { PerplexityService } from '../services/PerplexityService';
import { GenerateArticle } from '../../application/use-cases/GenerateArticle';
import { AutoGenerateArticles } from '../../application/use-cases/AutoGenerateArticles';
import { GenerateArticleManually } from '../../application/use-cases/GenerateArticleManually';
import { GetArticlesBySource } from '../../application/use-cases/GetArticlesBySource';
import { GetGenerationSettings } from '../../application/use-cases/GetGenerationSettings';
import { UpdateGenerationSettings } from '../../application/use-cases/UpdateGenerationSettings';
import { ContentAdminFacade } from '../../admin/ContentAdminFacade';

// Module-specific infrastructure
import { Logger } from '../logger/Logger';
import { Config } from '../../shared/config/env';

/**
 * Content module dependency injection container
 */
export class ContentContainer {
  private static instance: ContentContainer;
  private _config: Config;
  private _prisma: PrismaClient | null = null;
  private _logger: Logger | null = null;

  // Content module dependencies
  private _articleRepository: ArticleRepository | null = null;
  private _generationSettingsRepository: GenerationSettingsRepository | null = null;
  private _aiService: AiService | null = null;
  private _generateArticle: GenerateArticle | null = null;
  private _autoGenerateArticles: AutoGenerateArticles | null = null;
  private _generateArticleManually: GenerateArticleManually | null = null;
  private _getArticlesBySource: GetArticlesBySource | null = null;
  private _getGenerationSettings: GetGenerationSettings | null = null;
  private _updateGenerationSettings: UpdateGenerationSettings | null = null;
  private _contentAdminFacade: ContentAdminFacade | null = null;

  private constructor(config: Config) {
    this._config = config;
  }

  /**
   * Gets the singleton container instance
   */
  static getInstance(config?: Config): ContentContainer {
    if (!ContentContainer.instance) {
      if (!config) {
        throw new Error('Config is required for first container initialization');
      }
      ContentContainer.instance = new ContentContainer(config);
    }
    return ContentContainer.instance;
  }

  /**
   * Resets the container (useful for testing)
   */
  static reset(): void {
    ContentContainer.instance = null as any;
  }

  // =============================================
  // Infrastructure Dependencies
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
        serviceName: 'content-module',
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

  get generationSettingsRepository(): GenerationSettingsRepository {
    if (!this._generationSettingsRepository) {
      this._generationSettingsRepository = new PrismaGenerationSettingsRepository(this.prisma);
    }
    return this._generationSettingsRepository;
  }

  get aiService(): AiService {
    if (!this._aiService) {
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

  get autoGenerateArticles(): AutoGenerateArticles {
    if (!this._autoGenerateArticles) {
      this._autoGenerateArticles = new AutoGenerateArticles(
        this.articleRepository,
        this.aiService,
        this.logger
      );
    }
    return this._autoGenerateArticles;
  }

  get generateArticleManually(): GenerateArticleManually {
    if (!this._generateArticleManually) {
      this._generateArticleManually = new GenerateArticleManually(
        this.articleRepository,
        this.aiService,
        this.logger
      );
    }
    return this._generateArticleManually;
  }

  get getArticlesBySource(): GetArticlesBySource {
    if (!this._getArticlesBySource) {
      this._getArticlesBySource = new GetArticlesBySource(
        this.articleRepository,
        this.logger
      );
    }
    return this._getArticlesBySource;
  }

  get getGenerationSettings(): GetGenerationSettings {
    if (!this._getGenerationSettings) {
      this._getGenerationSettings = new GetGenerationSettings(
        this.generationSettingsRepository,
        this.logger
      );
    }
    return this._getGenerationSettings;
  }

  get updateGenerationSettings(): UpdateGenerationSettings {
    if (!this._updateGenerationSettings) {
      this._updateGenerationSettings = new UpdateGenerationSettings(
        this.generationSettingsRepository,
        this.logger
      );
    }
    return this._updateGenerationSettings;
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
  // Lifecycle Management
  // =============================================

  /**
   * Initializes all critical dependencies
   * Should be called during module startup
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing content module dependencies...');

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

      this.logger.info('Content module initialization completed successfully');
    } catch (error) {
      this.logger.error('Content module initialization failed', { error });
      throw error;
    }
  }

  /**
   * Gracefully shuts down all resources
   * Should be called during module shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down content module dependencies...');

      // Close database connections
      if (this._prisma) {
        await this._prisma.$disconnect();
        this.logger.info('Database connection closed');
      }

      // Flush any pending logs
      if (this._logger) {
        await this._logger.flush();
      }

      this.logger.info('Content module shutdown completed successfully');
    } catch (error) {
      console.error('Error during content module shutdown:', error);
      throw error;
    }
  }

  /**
   * Health check for all critical dependencies
   */
  async healthCheck(): Promise<ContentHealthCheckResult> {
    const checks: ContentHealthCheck[] = [];

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

    const isHealthy = checks.every(check => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date(),
      module: 'content',
    };
  }

  /**
   * Creates a container with mock dependencies for testing
   */
  static createTestContainer(mocks: Partial<ContentTestMocks> = {}): ContentContainer {
    const testConfig = Config.createTestConfig();
    const container = new ContentContainer(testConfig);

    // Override with mocks
    if (mocks.articleRepository) {
      container._articleRepository = mocks.articleRepository;
    }
    if (mocks.aiService) {
      container._aiService = mocks.aiService;
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

export interface ContentHealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  error?: string;
  timestamp: Date;
}

export interface ContentHealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: ContentHealthCheck[];
  timestamp: Date;
  module: string;
}

export interface ContentTestMocks {
  articleRepository: ArticleRepository;
  aiService: AiService;
  logger: Logger;
}

/**
 * Factory function to create a content container with environment-specific configuration
 */
export function createContentContainer(): ContentContainer {
  const config = Config.fromEnvironment();
  return ContentContainer.getInstance(config);
}

/**
 * Gets the current content container instance
 * Throws error if container hasn't been initialized
 */
export function getContentContainer(): ContentContainer {
  const instance = ContentContainer.getInstance();
  if (!instance) {
    throw new Error('Content container not initialized. Call createContentContainer() first.');
  }
  return instance;
}