/**
 * Dependency Injection Container for Sources Module - completely independent.
 *
 * This container is specific to the sources module and has no dependencies
 * on other modules, maintaining strict module independence.
 *
 * Key principles:
 * - Module-specific dependency configuration
 * - No external module dependencies
 * - Environment-aware configuration
 * - Easy testing with mock implementations
 */
import { PrismaClient } from '@prisma/client';
import { prisma as globalPrisma } from '../../../../shared/database/prisma';

// Sources Module Dependencies
import { SourceRepository } from '../../domain/ports/SourceRepository';
import { SourceFetchService } from '../../domain/ports/SourceFetchService';
import { FeedItemRepository } from '../../domain/ports/FeedItemRepository';
import { ArticleAutoGenerator } from '../../domain/ports/ArticleAutoGenerator';
import { PrismaSourceRepository } from '../repositories/PrismaSourceRepository';
import { InMemorySourceRepository } from '../repositories/InMemorySourceRepository';
import { FallbackSourceRepository } from '../repositories/FallbackSourceRepository';
import { PrismaFeedItemRepository } from '../repositories/PrismaFeedItemRepository';
import { UniversalFetchService } from '../services/UniversalFetchService';
import { ContentModuleArticleAutoGenerator } from '../adapters/ContentModuleArticleAutoGenerator';
import { CreateSource } from '../../application/use-cases/CreateSource';
import { GetSources } from '../../application/use-cases/GetSources';
import { FetchFromSource } from '../../application/use-cases/FetchFromSource';
import { UpdateSource } from '../../application/use-cases/UpdateSource';
import { UpdateSourceStatus } from '../../application/use-cases/UpdateSourceStatus';
import { SourcesAdminFacade } from '../../admin/SourcesAdminFacade';

// Module-specific infrastructure
import { Logger } from '../logger/Logger';
import { Config } from '../../shared/config/env';

/**
 * Sources module dependency injection container
 */
export class SourcesContainer {
  private static instance: SourcesContainer;
  private _config: Config;
  private _prisma: PrismaClient | null = null;
  private _logger: Logger | null = null;

  // Sources module dependencies
  private _sourceRepository: SourceRepository | null = null;
  private _feedItemRepository: FeedItemRepository | null = null;
  private _sourceFetchService: SourceFetchService | null = null;
  private _articleAutoGenerator: ArticleAutoGenerator | null = null;
  private _createSource: CreateSource | null = null;
  private _getSources: GetSources | null = null;
  private _fetchFromSource: FetchFromSource | null = null;
  private _updateSource: UpdateSource | null = null;
  private _updateSourceStatus: UpdateSourceStatus | null = null;
  private _sourcesAdminFacade: SourcesAdminFacade | null = null;

  private constructor(config: Config) {
    this._config = config;
  }

  /**
   * Gets the singleton container instance
   */
  static getInstance(config?: Config): SourcesContainer {
    if (!SourcesContainer.instance) {
      if (!config) {
        throw new Error('Config is required for first container initialization');
      }
      SourcesContainer.instance = new SourcesContainer(config);
    }
    return SourcesContainer.instance;
  }

  /**
   * Resets the container (useful for testing)
   */
  static reset(): void {
    SourcesContainer.instance = null as any;
  }

  // =============================================
  // Infrastructure Dependencies
  // =============================================

  get config(): Config {
    return this._config;
  }

  get prisma(): PrismaClient {
    if (!this._prisma) {
      try {
        // Use global singleton Prisma instance to avoid connection issues
        this._prisma = globalPrisma;

        // Test connection with a timeout
        this._prisma.$queryRaw`SELECT 1`.catch((error) => {
          this.logger.warn('Database connection test failed', { error });
        });

      } catch (error) {
        this.logger.error('Failed to initialize Prisma client', { error });
        throw error;
      }
    }
    return this._prisma;
  }

  get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger({
        level: this._config.app.logLevel,
        environment: this._config.app.env,
        serviceName: 'sources-module',
      });
    }
    return this._logger;
  }

  // =============================================
  // Sources Module Dependencies
  // =============================================

  get sourceRepository(): SourceRepository {
    if (!this._sourceRepository) {
      try {
        // Use Prisma repository now that database is working
        this.logger.info('🔄 [SourcesContainer] Using Prisma repository with PostgreSQL database');
        this._sourceRepository = new PrismaSourceRepository(this.prisma);
        console.log('✅ [SourcesContainer] PrismaSourceRepository initialized successfully');
      } catch (error) {
        // Fallback to in-memory if database fails
        this.logger.warn('Database connection failed, falling back to in-memory repository', { error });
        console.log('⚠️ [SourcesContainer] Falling back to InMemorySourceRepository due to error:', error);
        this._sourceRepository = new InMemorySourceRepository();
      }
    }
    return this._sourceRepository;
  }

  get feedItemRepository(): FeedItemRepository {
    if (!this._feedItemRepository) {
      this._feedItemRepository = new PrismaFeedItemRepository(this.prisma);
    }
    return this._feedItemRepository;
  }

  get sourceFetchService(): SourceFetchService {
    if (!this._sourceFetchService) {
      this._sourceFetchService = new UniversalFetchService();
    }
    return this._sourceFetchService;
  }

  get articleAutoGenerator(): ArticleAutoGenerator {
    if (!this._articleAutoGenerator) {
      this._articleAutoGenerator = new ContentModuleArticleAutoGenerator(
        this.feedItemRepository // Inject FeedItemRepository for status updates
      );
    }
    return this._articleAutoGenerator;
  }

  get createSource(): CreateSource {
    if (!this._createSource) {
      this._createSource = new CreateSource(
        this.sourceRepository,
        this.sourceFetchService
      );
    }
    return this._createSource;
  }

  get getSources(): GetSources {
    if (!this._getSources) {
      this._getSources = new GetSources(this.sourceRepository);
    }
    return this._getSources;
  }

  get fetchFromSource(): FetchFromSource {
    if (!this._fetchFromSource) {
      this._fetchFromSource = new FetchFromSource(
        this.sourceRepository,
        this.feedItemRepository,
        this.sourceFetchService,
        this.articleAutoGenerator
      );
    }
    return this._fetchFromSource;
  }

  get updateSource(): UpdateSource {
    if (!this._updateSource) {
      this._updateSource = new UpdateSource(
        this.sourceRepository,
        this.logger
      );
    }
    return this._updateSource;
  }

  get updateSourceStatus(): UpdateSourceStatus {
    if (!this._updateSourceStatus) {
      this._updateSourceStatus = new UpdateSourceStatus(
        this.sourceRepository,
        this.logger
      );
    }
    return this._updateSourceStatus;
  }

  get sourcesAdminFacade(): SourcesAdminFacade {
    if (!this._sourcesAdminFacade) {
      this._sourcesAdminFacade = new SourcesAdminFacade(
        this.createSource,
        this.getSources,
        this.fetchFromSource,
        this.updateSource,
        this.updateSourceStatus
      );
    }
    return this._sourcesAdminFacade;
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
      this.logger.info('Initializing sources module dependencies...');

      // Initialize database connection
      await this.prisma.$connect();
      this.logger.info('Database connection established');

      // Validate fetch service configuration
      const healthResult = await this.sourceFetchService.getServiceHealth();
      if (healthResult.isSuccess() && healthResult.value.isHealthy) {
        this.logger.info('Source fetch service is healthy');
      } else {
        this.logger.warn('Source fetch service health check failed', {
          error: healthResult.isFailure() ? healthResult.error.message : 'Unknown error'
        });
      }

      this.logger.info('Sources module initialization completed successfully');
    } catch (error) {
      this.logger.error('Sources module initialization failed', { error });
      throw error;
    }
  }

  /**
   * Gracefully shuts down all resources
   * Should be called during module shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down sources module dependencies...');

      // Close database connections
      if (this._prisma) {
        await this._prisma.$disconnect();
        this.logger.info('Database connection closed');
      }

      // Flush any pending logs
      if (this._logger) {
        await this._logger.flush();
      }

      this.logger.info('Sources module shutdown completed successfully');
    } catch (error) {
      console.error('Error during sources module shutdown:', error);
      throw error;
    }
  }

  /**
   * Health check for all critical dependencies
   */
  async healthCheck(): Promise<SourcesHealthCheckResult> {
    const checks: SourcesHealthCheck[] = [];

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

    // Fetch service health check
    try {
      const healthResult = await this.sourceFetchService.getServiceHealth();
      checks.push({
        name: 'fetch_service',
        status: healthResult.isSuccess() && healthResult.value.isHealthy ? 'healthy' : 'unhealthy',
        error: healthResult.isFailure() ? healthResult.error.message : undefined,
        timestamp: new Date(),
        metadata: healthResult.isSuccess() ? healthResult.value : undefined,
      });
    } catch (error) {
      checks.push({
        name: 'fetch_service',
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
      module: 'sources',
    };
  }

  /**
   * Creates a container with mock dependencies for testing
   */
  static createTestContainer(mocks: Partial<SourcesTestMocks> = {}): SourcesContainer {
    const testConfig = Config.createTestConfig();
    const container = new SourcesContainer(testConfig);

    // Override with mocks
    if (mocks.sourceRepository) {
      container._sourceRepository = mocks.sourceRepository;
    }
    if (mocks.sourceFetchService) {
      container._sourceFetchService = mocks.sourceFetchService;
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

export interface SourcesHealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  error?: string;
  timestamp: Date;
  metadata?: any;
}

export interface SourcesHealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: SourcesHealthCheck[];
  timestamp: Date;
  module: string;
}

export interface SourcesTestMocks {
  sourceRepository: SourceRepository;
  sourceFetchService: SourceFetchService;
  logger: Logger;
}

/**
 * Factory function to create a sources container with environment-specific configuration
 */
export function createSourcesContainer(): SourcesContainer {
  const config = Config.fromEnvironment();
  return SourcesContainer.getInstance(config);
}

/**
 * Gets the current sources container instance
 * Throws error if container hasn't been initialized
 */
export function getSourcesContainer(): SourcesContainer {
  const instance = SourcesContainer.getInstance();
  if (!instance) {
    throw new Error('Sources container not initialized. Call createSourcesContainer() first.');
  }
  return instance;
}