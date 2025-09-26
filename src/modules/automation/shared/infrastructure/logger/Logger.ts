/**
 * Simple logger implementation for the automation module.
 *
 * This provides basic logging functionality with different levels and
 * structured logging support. In production, this could be extended
 * to integrate with external logging services.
 */
export class Logger {
  constructor(
    private readonly config: {
      level: LogLevel;
      environment: string;
      serviceName: string;
    }
  ) {}

  info(message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, data);
    }
  }

  warn(message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, data);
    }
  }

  error(message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('ERROR', message, data);
    }
  }

  debug(message: string, data?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, data);
    }
  }

  private log(level: string, message: string, data?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.serviceName,
      environment: this.config.environment,
      message,
      ...data
    };

    // For now, just use console.log
    // In production, this would go to a proper logging service
    console.log(JSON.stringify(logEntry));
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  async flush(): Promise<void> {
    // No-op for console logger, but would flush buffers in production
  }
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}