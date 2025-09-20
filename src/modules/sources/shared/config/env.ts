/**
 * Environment configuration for Sources module
 * Manages environment variables and provides typed configuration
 */
export class Config {
  public readonly app: AppConfig;
  public readonly database: DatabaseConfig;
  public readonly sources: SourcesConfig;

  constructor(
    app: AppConfig,
    database: DatabaseConfig,
    sources: SourcesConfig
  ) {
    this.app = app;
    this.database = database;
    this.sources = sources;
  }

  static fromEnvironment(): Config {
    return new Config(
      {
        env: (process.env.NODE_ENV as Environment) || 'development',
        logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
        port: parseInt(process.env.PORT || '3000'),
      },
      {
        url: process.env.DATABASE_URL || '',
        enableLogging: process.env.DATABASE_LOGGING === 'true',
      },
      {
        rss: {
          userAgent: process.env.RSS_USER_AGENT || 'AutoGeorge/1.0',
          timeout: parseInt(process.env.RSS_TIMEOUT || '30000'),
          maxItems: parseInt(process.env.RSS_MAX_ITEMS || '100'),
        },
        telegram: {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          timeout: parseInt(process.env.TELEGRAM_TIMEOUT || '30000'),
        },
        calendar: {
          googleApiKey: process.env.GOOGLE_CALENDAR_API_KEY,
          timeout: parseInt(process.env.CALENDAR_TIMEOUT || '30000'),
        },
        polling: {
          defaultInterval: parseInt(process.env.DEFAULT_POLLING_INTERVAL || '60'),
          maxConcurrent: parseInt(process.env.MAX_CONCURRENT_FETCHES || '5'),
        }
      }
    );
  }

  static createTestConfig(): Config {
    return new Config(
      {
        env: 'test',
        logLevel: 'error',
        port: 3001,
      },
      {
        url: 'postgresql://test:test@localhost:5432/test',
        enableLogging: false,
      },
      {
        rss: {
          userAgent: 'AutoGeorge-Test/1.0',
          timeout: 5000,
          maxItems: 10,
        },
        telegram: {
          botToken: 'test-token',
          timeout: 5000,
        },
        calendar: {
          googleApiKey: 'test-key',
          timeout: 5000,
        },
        polling: {
          defaultInterval: 5,
          maxConcurrent: 2,
        }
      }
    );
  }

  isDevelopment(): boolean {
    return this.app.env === 'development';
  }

  isProduction(): boolean {
    return this.app.env === 'production';
  }

  isTest(): boolean {
    return this.app.env === 'test';
  }
}

export interface AppConfig {
  env: Environment;
  logLevel: LogLevel;
  port: number;
}

export interface DatabaseConfig {
  url: string;
  enableLogging: boolean;
}

export interface SourcesConfig {
  rss: RssConfig;
  telegram: TelegramConfig;
  calendar: CalendarConfig;
  polling: PollingConfig;
}

export interface RssConfig {
  userAgent: string;
  timeout: number;
  maxItems: number;
}

export interface TelegramConfig {
  botToken?: string;
  timeout: number;
}

export interface CalendarConfig {
  googleApiKey?: string;
  timeout: number;
}

export interface PollingConfig {
  defaultInterval: number; // minutes
  maxConcurrent: number;
}

export type Environment = 'development' | 'production' | 'test';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';