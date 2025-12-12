import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FileLoggerService } from '../services/logger.service';
import { ApiErrorResponseDto } from '../dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly fileLogger = new FileLoggerService();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const requestId = 
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-idempotency-key'] as string) ||
      undefined;

    // Extract validation errors if present
    let validationErrors: Record<string, string[]> | undefined;
    if (
      typeof message === 'object' &&
      message !== null &&
      'message' in message &&
      Array.isArray((message as any).message)
    ) {
      const messages = (message as any).message as string[];
      validationErrors = {};
      messages.forEach((msg) => {
        // Parse validation message format: "property should not be empty"
        const match = msg.match(/^(\w+)\s+(.+)$/);
        if (match) {
          const [, property, error] = match;
          if (!validationErrors![property]) {
            validationErrors![property] = [];
          }
          validationErrors![property].push(error);
        } else {
          // Fallback: use 'general' key
          if (!validationErrors!['general']) {
            validationErrors!['general'] = [];
          }
          validationErrors!['general'].push(msg);
        }
      });
    }

    const errorResponse: ApiErrorResponseDto = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'An error occurred',
      error:
        typeof message === 'object' && (message as any).error
          ? (message as any).error
          : HttpStatus[status] || 'Error',
      validationErrors,
      requestId,
    };

    // Log error to file
    const errorDetails = {
      ...errorResponse,
      body: request.body,
      query: request.query,
      params: request.params,
      headers: {
        authorization: request.headers.authorization ? '[REDACTED]' : undefined,
        'user-agent': request.headers['user-agent'],
        ip: request.ip || request.connection.remoteAddress,
      },
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    this.fileLogger.error(
      JSON.stringify(errorDetails, null, 2),
      exception instanceof Error ? exception.stack : undefined,
      'HTTP_EXCEPTION',
    );

    // Also log to console for development
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}`);
    }

    response.status(status).json(errorResponse);
  }
}

