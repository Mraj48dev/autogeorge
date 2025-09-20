/**
 * Structured logging implementation for AutoGeorge.
 *
 * This logger provides:
 * - Structured JSON logging for production
 * - Pretty-printed logs for development
 * - Multiple log levels with filtering
 * - Context injection for tracing
 * - Performance tracking
 * - Safe error serialization
 * - Async batching for performance
 *
 * The logger is designed to be framework-agnostic and can be easily
 * replaced with other logging solutions (Winston, Pino, etc.).
 */

export interface LoggerConfig {
  level: LogLevel;
  environment: string;
  serviceName: string;
  version?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  batchSize?: number;
  flushInterval?: number;
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  correlationId?: string;
  traceId?: string;
  module?: string;
  useCase?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: SerializedError;
  duration?: number;
  service: string;
  environment: string;
  version?: string;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  cause?: SerializedError;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

/**
 * Main Logger class with structured logging capabilities
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: LoggerConfig) {
    this.config = {
      enableConsole: true,
      enableFile: false,
      filePath: './logs/app.log',
      batchSize: 100,
      flushInterval: 5000,
      version: '1.0.0',
      ...config,
    };

    // Start flush timer
    this.startFlushTimer();

    // Ensure graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Logs an error message
   */
  error(message: string, context: LogContext = {}, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }

  /**
   * Logs an info message
   */
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }

  /**
   * Logs a trace message
   */
  trace(message: string, context: LogContext = {}): void {
    this.log('trace', message, context);
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config);
    childLogger.addContext(context);
    return childLogger;
  }

  /**
   * Times a function execution and logs the duration
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = Date.now();
    const startLabel = `${label} started`;

    this.debug(startLabel, context);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.info(`${label} completed`, {
        ...context,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(`${label} failed`, {
        ...context,
        duration,
        success: false,
      }, error as Error);

      throw error;
    }
  }

  /**
   * Times a synchronous function execution
   */
  timeSync<T>(
    label: string,
    fn: () => T,
    context: LogContext = {}
  ): T {
    const startTime = Date.now();

    try {
      const result = fn();
      const duration = Date.now() - startTime;

      this.debug(`${label} completed`, {
        ...context,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.error(`${label} failed`, {
        ...context,
        duration,
      }, error as Error);

      throw error;
    }
  }

  /**
   * Flushes all buffered logs immediately
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    await this.writeLogs(logsToFlush);
  }

  /**
   * Shuts down the logger gracefully
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      context: this.sanitizeContext(context),
      service: this.config.serviceName,
      environment: this.config.environment,
      version: this.config.version,
    };

    if (error) {
      logEntry.error = this.serializeError(error);
    }

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Immediate console output for development or critical errors
    if (this.config.enableConsole && (this.config.environment === 'development' || level === 'error')) {
      this.writeToConsole(logEntry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush().catch(err => {
        console.error('Failed to flush logs:', err);
      });
    }
  }

  /**
   * Checks if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const configLevel = LOG_LEVELS[this.config.level];
    const messageLevel = LOG_LEVELS[level];
    return messageLevel <= configLevel;
  }

  /**
   * Sanitizes log message to prevent injection attacks
   */
  private sanitizeMessage(message: string): string {
    if (typeof message !== 'string') {
      return String(message);
    }

    // Remove control characters and limit length
    return message
      .replace(/[\x00-\x1F\x7F]/g, '')
      .substring(0, 10000);
  }

  /**
   * Sanitizes context object to remove sensitive data
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'apiKey', 'auth'];

    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value as LogContext);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Serializes an error object safely
   */
  private serializeError(error: Error): SerializedError {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      serialized.stack = error.stack;
    }

    // Handle custom error properties
    if ('code' in error) {
      serialized.code = (error as any).code;
    }

    // Handle error cause chain
    if ('cause' in error && error.cause instanceof Error) {
      serialized.cause = this.serializeError(error.cause);
    }

    return serialized;
  }

  /**
   * Writes logs to console with formatting
   */
  private writeToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, error } = entry;

    // Color coding for different levels
    const colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
      trace: '\x1b[37m',   // White
    };

    const reset = '\x1b[0m';
    const levelColor = colors[level] || colors.info;

    if (this.config.environment === 'development') {
      // Pretty format for development
      console.log(
        `${levelColor}[${level.toUpperCase()}]${reset} ${timestamp} ${message}`,
        Object.keys(context).length > 0 ? context : '',
        error ? error : ''
      );
    } else {
      // JSON format for production
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Writes logs to configured outputs
   */
  private async writeLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    // Write to file if enabled
    if (this.config.enableFile) {
      await this.writeToFile(logs);
    }

    // Write to console if enabled (and not already written)
    if (this.config.enableConsole && this.config.environment !== 'development') {
      logs.forEach(log => this.writeToConsole(log));
    }
  }

  /**
   * Writes logs to file (simplified implementation)
   */
  private async writeToFile(logs: LogEntry[]): Promise<void> {
    // In a real implementation, you would use fs.promises.appendFile
    // or a more sophisticated file rotation mechanism
    const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';

    try {
      // This would be implemented with actual file I/O
      console.log(`Would write to ${this.config.filePath}:`, logLines);
    } catch (error) {
      console.error('Failed to write logs to file:', error);
    }
  }

  /**
   * Starts the periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Scheduled log flush failed:', err);
      });
    }, this.config.flushInterval);
  }

  /**
   * Sets up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    // Only setup once per process
    if ((global as any).__autogeorge_logger_shutdown_setup__) {
      return;
    }
    (global as any).__autogeorge_logger_shutdown_setup__ = true;

    const shutdown = async () => {
      try {
        await this.shutdown();
      } catch (error) {
        console.error('Logger shutdown error:', error);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('beforeExit', shutdown);
  }

  /**
   * Adds persistent context to this logger instance
   */
  private addContext(context: LogContext): void {
    // This would be implemented by storing context and merging it with each log
    // For now, this is a placeholder
  }
}

/**
 * Creates a logger instance with environment-appropriate defaults
 */
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const defaultConfig: LoggerConfig = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
    environment: process.env.NODE_ENV || 'development',
    serviceName: 'autogeorge',
    version: process.env.npm_package_version || '1.0.0',
  };

  return new Logger({ ...defaultConfig, ...config });
}

/**
 * Performance monitoring decorator
 */
export function logPerformance(logger: Logger, label?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      return logger.time(methodLabel, () => originalMethod.apply(this, args), {
        method: propertyKey,
        class: target.constructor.name,
      });
    };

    return descriptor;
  };
}