/**
 * Configuration management for Content Module - completely independent.
 *
 * This configuration is specific to the content module and has no dependencies
 * on the global shared configuration.
 */

export interface ContentModuleConfig {
  database: {
    url: string;
    enableLogging: boolean;
  };
  ai: {
    perplexityApiKey: string;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
  app: {
    env: string;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
}

export class Config {
  private constructor(private config: ContentModuleConfig) {}

  static fromEnvironment(): Config {
    const config: ContentModuleConfig = {
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/autogeorge',
        enableLogging: process.env.DATABASE_LOGGING === 'true',
      },
      ai: {
        perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
        defaultModel: process.env.AI_DEFAULT_MODEL || 'sonar',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      },
      app: {
        env: process.env.NODE_ENV || 'development',
        logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
      },
    };

    return new Config(config);
  }

  static createTestConfig(): Config {
    const config: ContentModuleConfig = {
      database: {
        url: 'postgresql://localhost:5432/autogeorge_test',
        enableLogging: false,
      },
      ai: {
        perplexityApiKey: 'test-key',
        defaultModel: 'sonar',
        maxTokens: 1000,
        temperature: 0.5,
      },
      app: {
        env: 'test',
        logLevel: 'ERROR',
      },
    };

    return new Config(config);
  }

  get database() {
    return this.config.database;
  }

  get ai() {
    return this.config.ai;
  }

  get app() {
    return this.config.app;
  }
}