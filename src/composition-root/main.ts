/**
 * Main application entry point and composition root.
 *
 * This is where the application starts up and all the pieces come together.
 * It's responsible for:
 * - Loading configuration
 * - Initializing the dependency container
 * - Setting up error handling
 * - Starting the HTTP server
 * - Graceful shutdown handling
 * - Health checks and monitoring
 *
 * This file should remain thin and focused on orchestration.
 * All business logic should be in the domain and application layers.
 */
import { createServer } from 'http';
import next from 'next';
import { Config } from '../shared/config/env';
import { Container, createContainer } from './container';

/**
 * Main application class that orchestrates startup and shutdown
 */
export class Application {
  private container: Container;
  private nextApp: any;
  private server: any;
  private isShuttingDown = false;

  constructor(private config: Config) {
    this.container = createContainer();
  }

  /**
   * Starts the application
   */
  async start(): Promise<void> {
    try {
      this.container.logger.info('Starting AutoGeorge application...', {
        env: this.config.app.env,
        version: process.env.npm_package_version || 'unknown',
        nodeVersion: process.version,
      });

      // Initialize the dependency container
      await this.container.initialize();

      // Validate configuration
      const configValidation = this.config.validate();
      if (!configValidation.isValid) {
        throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
      }

      if (configValidation.warnings.length > 0) {
        this.container.logger.warn('Configuration warnings:', {
          warnings: configValidation.warnings,
        });
      }

      // Initialize Next.js
      this.nextApp = next({
        dev: this.config.app.isDevelopment,
        hostname: 'localhost',
        port: this.config.app.port,
      });

      await this.nextApp.prepare();
      this.container.logger.info('Next.js application prepared');

      // Create HTTP server
      const handle = this.nextApp.getRequestHandler();
      this.server = createServer(async (req, res) => {
        try {
          await handle(req, res);
        } catch (error) {
          this.container.logger.error('Request handling error:', { error });
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start listening
      await new Promise<void>((resolve) => {
        this.server.listen(this.config.app.port, () => {
          this.container.logger.info('Server started successfully', {
            port: this.config.app.port,
            url: this.config.app.baseUrl,
            env: this.config.app.env,
          });
          resolve();
        });
      });

      // Schedule health checks
      this.scheduleHealthChecks();

      this.container.logger.info('Application startup completed successfully');

    } catch (error) {
      this.container.logger.error('Application startup failed:', { error });
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Gracefully shuts down the application
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.container.logger.info('Initiating graceful shutdown...');

    try {
      // Stop accepting new connections
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            this.container.logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close Next.js
      if (this.nextApp) {
        await this.nextApp.close();
        this.container.logger.info('Next.js application closed');
      }

      // Shutdown container dependencies
      await this.container.shutdown();

      this.container.logger.info('Graceful shutdown completed');

    } catch (error) {
      this.container.logger.error('Error during shutdown:', { error });
      throw error;
    }
  }

  /**
   * Sets up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.container.logger.info(`Received ${signal}, starting graceful shutdown...`);
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        this.container.logger.error('Shutdown error:', { error });
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      this.container.logger.error('Uncaught exception:', { error });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.container.logger.error('Unhandled rejection:', {
        reason,
        promise: promise.toString(),
      });
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Schedules periodic health checks
   */
  private scheduleHealthChecks(): void {
    if (!this.config.monitoring.enableMetrics) {
      return;
    }

    const healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.container.healthCheck();
        if (health.status === 'unhealthy') {
          this.container.logger.warn('Health check failed:', { health });
        } else {
          this.container.logger.debug('Health check passed:', { health });
        }
      } catch (error) {
        this.container.logger.error('Health check error:', { error });
      }
    }, 30000); // Check every 30 seconds

    // Clear interval on shutdown
    process.on('SIGTERM', () => clearInterval(healthCheckInterval));
    process.on('SIGINT', () => clearInterval(healthCheckInterval));
  }

  /**
   * Gets the current application status
   */
  async getStatus(): Promise<ApplicationStatus> {
    const health = await this.container.healthCheck();

    return {
      status: this.isShuttingDown ? 'shutting_down' : health.status,
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      environment: this.config.app.env,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      health,
      timestamp: new Date(),
    };
  }
}

/**
 * Application status interface
 */
export interface ApplicationStatus {
  status: 'healthy' | 'unhealthy' | 'shutting_down';
  version: string;
  uptime: number;
  environment: string;
  nodeVersion: string;
  memoryUsage: NodeJS.MemoryUsage;
  health: any;
  timestamp: Date;
}

/**
 * Main entry point - creates and starts the application
 */
export async function main(): Promise<void> {
  try {
    // Load configuration from environment
    const config = Config.fromEnvironment();

    // Create and start the application
    const app = new Application(config);
    await app.start();

    // Export app instance for testing and external access
    (global as any).__autogeorge_app__ = app;

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * CLI entry point for administrative commands
 */
export async function cli(args: string[]): Promise<void> {
  try {
    const config = Config.fromEnvironment();
    const container = createContainer();
    await container.initialize();

    // Parse CLI arguments and execute appropriate admin commands
    const [command, ...commandArgs] = args;

    switch (command) {
      case 'health':
        const health = await container.healthCheck();
        console.log(JSON.stringify(health, null, 2));
        break;

      case 'generate-article':
        const contentAdmin = container.contentAdminFacade;
        const result = await contentAdmin.execute('GenerateArticle', {
          prompt: commandArgs[0] || 'Write an article about renewable energy',
          model: 'llama-3.1-sonar-large-128k-online',
        });

        if (result.isSuccess()) {
          console.log('Article generated successfully:', result.value.output);
        } else {
          console.error('Article generation failed:', result.error.message);
          process.exit(1);
        }
        break;

      case 'list-use-cases':
        const useCases = container.contentAdminFacade.listUseCases();
        console.log(JSON.stringify(useCases, null, 2));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: health, generate-article, list-use-cases');
        process.exit(1);
    }

    await container.shutdown();

  } catch (error) {
    console.error('CLI execution failed:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    // CLI mode
    cli(args);
  } else {
    // Server mode
    main();
  }
}