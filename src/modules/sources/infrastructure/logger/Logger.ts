/**
 * Logger implementation for Sources module
 * Provides structured logging with context and metadata
 */
export class Logger {
  private readonly serviceName: string;
  private readonly environment: string;
  private readonly logLevel: LogLevel;

  constructor(config: LoggerConfig) {
    this.serviceName = config.serviceName;
    this.environment = config.environment;
    this.logLevel = config.level;
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, metadata);
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, metadata);
    }
  }

  error(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      this.log('error', message, metadata);
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, metadata);
    }
  }

  async flush(): Promise<void> {
    // In a real implementation, this would flush any buffered logs
    // For now, this is a no-op since we're using console
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      environment: this.environment,
      message,
      metadata: metadata || {},
    };

    // In production, this would go to a proper logging service
    // For now, using console with structured output
    const logString = JSON.stringify(logEntry, null, 2);

    switch (level) {
      case 'debug':
        console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }
  }
}

export interface LoggerConfig {
  serviceName: string;
  environment: string;
  level: LogLevel;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  message: string;
  metadata: Record<string, any>;
}