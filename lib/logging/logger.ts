export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  awsRequestId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private formatLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    awsRequestId?: string
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      awsRequestId,
      metadata,
    };
  }

  debug(message: string, contextOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      const context = typeof contextOrMetadata === 'string' ? contextOrMetadata : undefined;
      const meta = typeof contextOrMetadata === 'object' ? contextOrMetadata : metadata;
      const log = this.formatLog('DEBUG', message, context, meta);
      console.debug(JSON.stringify(log));
    }
  }

  info(message: string, contextOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    const context = typeof contextOrMetadata === 'string' ? contextOrMetadata : undefined;
    const meta = typeof contextOrMetadata === 'object' ? contextOrMetadata : metadata;
    const log = this.formatLog('INFO', message, context, meta);
    console.info(JSON.stringify(log));
  }

  warn(message: string, contextOrMetadata?: string | Record<string, unknown>, metadata?: Record<string, unknown>): void {
    const context = typeof contextOrMetadata === 'string' ? contextOrMetadata : undefined;
    const meta = typeof contextOrMetadata === 'object' ? contextOrMetadata : metadata;
    const log = this.formatLog('WARN', message, context, meta);
    console.warn(JSON.stringify(log));
  }

  error(message: string, contextOrMetadata?: string | Record<string, unknown>, error?: unknown, metadata?: Record<string, unknown>): void {
    const context = typeof contextOrMetadata === 'string' ? contextOrMetadata : undefined;
    const meta = typeof contextOrMetadata === 'object' ? contextOrMetadata : metadata;
    const errObj = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error ? { raw: error } : undefined;
    const log = this.formatLog('ERROR', message, context, { ...meta, ...(errObj ? { error: errObj } : {}) });
    console.error(JSON.stringify(log));
  }
}

export const logger = new Logger();
