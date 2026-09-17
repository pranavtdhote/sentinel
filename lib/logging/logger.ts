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

  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      const log = this.formatLog('DEBUG', message, context, metadata);
      console.debug(JSON.stringify(log));
    }
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const log = this.formatLog('INFO', message, context, metadata);
    console.info(JSON.stringify(log));
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const log = this.formatLog('WARN', message, context, metadata);
    console.warn(JSON.stringify(log));
  }

  error(message: string, context?: string, error?: unknown, metadata?: Record<string, unknown>): void {
    const errObj = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { raw: error };
    const log = this.formatLog('ERROR', message, context, { ...metadata, error: errObj });
    console.error(JSON.stringify(log));
  }
}

export const logger = new Logger();
