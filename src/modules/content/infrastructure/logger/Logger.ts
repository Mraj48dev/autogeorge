/**
 * Logger implementation for Content Module - completely independent.
 *
 * This logger is specific to the content module and has no dependencies
 * on the global shared infrastructure.
 */

export interface LogLevel {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  module: string;
}

export interface LoggerConfig {
  level: keyof LogLevel;
  environment: string;
  serviceName: string;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log('ERROR', message, context);
  }

  private log(level: keyof LogLevel, message: string, context?: Record<string, any>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      module: 'content',
    };

    // Simple console output - in production you might want to use a proper logging service
    const logOutput = {
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      module: logEntry.module,
      service: this.config.serviceName,
      message: logEntry.message,
      ...(context && { context }),
    };

    if (level === 'ERROR') {
      console.error(JSON.stringify(logOutput));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(logOutput));
    } else {
      console.log(JSON.stringify(logOutput));
    }
  }

  async flush(): Promise<void> {
    // In a real implementation, this would flush any pending log entries
    // For console logging, this is a no-op
    return Promise.resolve();
  }
}