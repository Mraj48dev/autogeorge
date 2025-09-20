/**
 * Environment configuration following 12-factor app principles.
 *
 * This module centralizes all environment-based configuration,
 * ensuring that:
 * - No secrets are committed to the repository
 * - Configuration is explicit and validated
 * - Default values are provided where appropriate
 * - Type safety is maintained throughout the application
 * - Different environments can have different configurations
 *
 * All configuration values are loaded from environment variables
 * with proper validation and sensible defaults.
 */

/**
 * Main configuration class that loads and validates all environment variables
 */
export class Config {
  constructor(
    public readonly app: AppConfig,
    public readonly database: DatabaseConfig,
    public readonly auth: AuthConfig,
    public readonly ai: AiConfig,
    public readonly api: ApiConfig,
    public readonly security: SecurityConfig,
    public readonly monitoring: MonitoringConfig,
    public readonly features: FeatureFlags
  ) {}

  /**
   * Creates configuration from environment variables
   */
  static fromEnvironment(): Config {
    // Load and validate all environment variables
    const nodeEnv = process.env.NODE_ENV || 'development';

    return new Config(
      {
        env: nodeEnv as Environment,
        port: parseInt(process.env.PORT || '3000', 10),
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        isDevelopment: nodeEnv === 'development',
        isProduction: nodeEnv === 'production',
        isTest: nodeEnv === 'test',
      },
      {
        url: this.requiredEnvVar('DATABASE_URL'),
        enableLogging: process.env.DATABASE_LOGGING === 'true',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
        connectionTimeout: parseInt(process.env.DATABASE_TIMEOUT || '5000', 10),
      },
      {
        nextAuthSecret: this.requiredEnvVar('NEXTAUTH_SECRET'),
        nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        providers: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        },
        sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000', 10), // 30 days
      },
      {
        perplexityApiKey: this.requiredEnvVar('PERPLEXITY_API_KEY'),
        openaiApiKey: process.env.OPENAI_API_KEY,
        defaultModel: process.env.AI_DEFAULT_MODEL || 'sonar',
        maxTokensPerRequest: parseInt(process.env.AI_MAX_TOKENS || '4000', 10),
        requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT || '60000', 10),
        rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT || '100', 10),
      },
      {
        rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
        rateLimitMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
        bodyParserLimit: process.env.API_BODY_LIMIT || '1mb',
        enableSwagger: process.env.ENABLE_SWAGGER === 'true',
        apiPrefix: process.env.API_PREFIX || '/api',
      },
      {
        jwtSecret: this.requiredEnvVar('JWT_SECRET'),
        encryptionKey: this.requiredEnvVar('ENCRYPTION_KEY'),
        hashRounds: parseInt(process.env.HASH_ROUNDS || '12', 10),
        csrfSecret: process.env.CSRF_SECRET,
        allowedHosts: process.env.ALLOWED_HOSTS?.split(',') || [],
      },
      {
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
        sentryDsn: process.env.SENTRY_DSN,
        logFlushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '5000', 10),
      },
      {
        enableQueue: process.env.ENABLE_QUEUE !== 'false',
        enableCaching: process.env.ENABLE_CACHING !== 'false',
        enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
        enableAdminPanel: process.env.ENABLE_ADMIN_PANEL !== 'false',
        enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
      }
    );
  }

  /**
   * Creates test configuration with safe defaults
   */
  static createTestConfig(): Config {
    return new Config(
      {
        env: 'test',
        port: 3001,
        baseUrl: 'http://localhost:3001',
        logLevel: 'error',
        corsOrigins: ['http://localhost:3001'],
        isDevelopment: false,
        isProduction: false,
        isTest: true,
      },
      {
        url: 'postgresql://test:test@localhost:5432/autogeorge_test',
        enableLogging: false,
        maxConnections: 5,
        connectionTimeout: 1000,
      },
      {
        nextAuthSecret: 'test-secret-key',
        nextAuthUrl: 'http://localhost:3001',
        providers: {
          google: { clientId: undefined, clientSecret: undefined },
          github: { clientId: undefined, clientSecret: undefined },
        },
        sessionMaxAge: 3600,
      },
      {
        perplexityApiKey: 'test-perplexity-key',
        openaiApiKey: 'test-openai-key',
        defaultModel: 'test-model',
        maxTokensPerRequest: 1000,
        requestTimeout: 10000,
        rateLimitPerMinute: 1000,
      },
      {
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 1000,
        bodyParserLimit: '1mb',
        enableSwagger: false,
        apiPrefix: '/api',
      },
      {
        jwtSecret: 'test-jwt-secret',
        encryptionKey: 'test-encryption-key',
        hashRounds: 4, // Faster for tests
        csrfSecret: 'test-csrf-secret',
        allowedHosts: ['localhost'],
      },
      {
        enableMetrics: false,
        metricsPort: 9091,
        sentryDsn: undefined,
        logFlushInterval: 1000,
      },
      {
        enableQueue: false,
        enableCaching: false,
        enableRateLimiting: false,
        enableAdminPanel: false,
        enableWebhooks: false,
      }
    );
  }

  /**
   * Validates that all required configuration is present and valid
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate app configuration
    if (this.app.port < 1 || this.app.port > 65535) {
      errors.push('Invalid port number');
    }

    // Validate database configuration
    if (!this.database.url.startsWith('postgresql://')) {
      errors.push('Database URL must be a PostgreSQL connection string');
    }

    // Validate auth configuration
    if (this.auth.nextAuthSecret.length < 32) {
      warnings.push('NextAuth secret should be at least 32 characters long');
    }

    // Validate AI configuration
    if (!this.ai.perplexityApiKey.startsWith('pplx-')) {
      warnings.push('Perplexity API key format appears incorrect');
    }

    // Validate security configuration
    if (this.security.jwtSecret.length < 32) {
      errors.push('JWT secret must be at least 32 characters long');
    }

    if (this.security.encryptionKey.length < 32) {
      errors.push('Encryption key must be at least 32 characters long');
    }

    // Production-specific validations
    if (this.app.isProduction) {
      if (!this.monitoring.sentryDsn) {
        warnings.push('Sentry DSN not configured for production');
      }

      if (this.app.corsOrigins.includes('*')) {
        errors.push('CORS origins should not allow all origins in production');
      }

      if (!this.security.csrfSecret) {
        warnings.push('CSRF secret not configured for production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Returns configuration for a specific environment
   */
  forEnvironment(env: Environment): Partial<Config> {
    switch (env) {
      case 'development':
        return {
          monitoring: {
            ...this.monitoring,
            enableMetrics: false,
          },
          features: {
            ...this.features,
            enableQueue: false,
          },
        };

      case 'production':
        return {
          app: {
            ...this.app,
            logLevel: 'warn',
          },
          monitoring: {
            ...this.monitoring,
            enableMetrics: true,
          },
        };

      case 'test':
        return {
          app: {
            ...this.app,
            logLevel: 'error',
          },
          features: {
            ...this.features,
            enableQueue: false,
            enableCaching: false,
          },
        };

      default:
        return {};
    }
  }

  /**
   * Helper method to get required environment variables
   */
  private static requiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }
}

// Type definitions for configuration sections

export interface AppConfig {
  env: Environment;
  port: number;
  baseUrl: string;
  logLevel: LogLevel;
  corsOrigins: string[];
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

export interface DatabaseConfig {
  url: string;
  enableLogging: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export interface AuthConfig {
  nextAuthSecret: string;
  nextAuthUrl: string;
  providers: {
    google: AuthProvider;
    github: AuthProvider;
  };
  sessionMaxAge: number;
}

export interface AuthProvider {
  clientId?: string;
  clientSecret?: string;
}

export interface AiConfig {
  perplexityApiKey: string;
  openaiApiKey?: string;
  defaultModel: string;
  maxTokensPerRequest: number;
  requestTimeout: number;
  rateLimitPerMinute: number;
}

export interface ApiConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  bodyParserLimit: string;
  enableSwagger: boolean;
  apiPrefix: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  encryptionKey: string;
  hashRounds: number;
  csrfSecret?: string;
  allowedHosts: string[];
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  metricsPort: number;
  sentryDsn?: string;
  logFlushInterval: number;
}

export interface FeatureFlags {
  enableQueue: boolean;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableAdminPanel: boolean;
  enableWebhooks: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type Environment = 'development' | 'production' | 'test' | 'staging';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';