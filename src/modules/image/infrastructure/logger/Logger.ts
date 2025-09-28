/**
 * Logger interface for the Image module
 */
export interface Logger {
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  flush?(): Promise<void>;
}

/**
 * Console Logger implementation
 */
export class ConsoleLogger implements Logger {
  constructor(private serviceName: string = 'image-module') {}

  info(message: string, context?: any): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: any): void {
    this.log('ERROR', message, context);
  }

  debug(message: string, context?: any): void {
    this.log('DEBUG', message, context);
  }

  private log(level: string, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...(context && { context })
    };

    console.log(JSON.stringify(logEntry));
  }

  async flush(): Promise<void> {
    // No-op for console logger
  }
}