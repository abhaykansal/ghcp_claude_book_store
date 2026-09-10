/**
 * Centralized logging utility for the application
 * Provides consistent logging across all components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private component: string;
  private logLevel: LogLevel;

  constructor(component: string, logLevel: LogLevel = 'info') {
    this.component = component;
    this.logLevel = logLevel;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.component}] ${message}${dataStr}`;
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

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    if (this.shouldLog('error')) {
      let errorInfo = '';
      if (error instanceof Error) {
        errorInfo = ` | ${error.message} | ${error.stack}`;
      } else if (error) {
        errorInfo = ` | ${JSON.stringify(error)}`;
      }
      console.error(this.formatMessage('error', message, data) + errorInfo);
    }
  }
}
