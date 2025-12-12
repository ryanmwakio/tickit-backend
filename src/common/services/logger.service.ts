import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly errorLogPath = path.join(this.logDir, 'error.log');
  private readonly combinedLogPath = path.join(this.logDir, 'combined.log');

  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: any, context?: string, stack?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const stackStr = stack ? `\n${stack}` : '';
    
    if (typeof message === 'object') {
      message = JSON.stringify(message, null, 2);
    }
    
    return `${timestamp} ${level} ${contextStr} ${message}${stackStr}\n`;
  }

  private writeToFile(filePath: string, content: string): void {
    try {
      fs.appendFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(message: any, context?: string) {
    const formatted = this.formatMessage('LOG', message, context);
    this.writeToFile(this.combinedLogPath, formatted);
    console.log(message, context ? `[${context}]` : '');
  }

  error(message: any, stack?: string, context?: string) {
    const formatted = this.formatMessage('ERROR', message, context, stack);
    this.writeToFile(this.errorLogPath, formatted);
    this.writeToFile(this.combinedLogPath, formatted);
    console.error(message, stack, context ? `[${context}]` : '');
  }

  warn(message: any, context?: string) {
    const formatted = this.formatMessage('WARN', message, context);
    this.writeToFile(this.combinedLogPath, formatted);
    console.warn(message, context ? `[${context}]` : '');
  }

  debug(message: any, context?: string) {
    const formatted = this.formatMessage('DEBUG', message, context);
    this.writeToFile(this.combinedLogPath, formatted);
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, context ? `[${context}]` : '');
    }
  }

  verbose(message: any, context?: string) {
    const formatted = this.formatMessage('VERBOSE', message, context);
    this.writeToFile(this.combinedLogPath, formatted);
    if (process.env.NODE_ENV === 'development') {
      console.log(message, context ? `[${context}]` : '');
    }
  }
}

