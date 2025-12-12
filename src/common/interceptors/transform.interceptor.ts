import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';

/**
 * Global response transformation interceptor
 * Wraps all successful responses in standardized format
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string || 
                     request.headers['x-idempotency-key'] as string ||
                     undefined;

    return next.handle().pipe(
      map((data) => {
        // If data is already in the correct format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        // Check if it's a paginated response
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'total' in data &&
          'page' in data &&
          'limit' in data
        ) {
          const paginated = data;
          const totalPages = Math.ceil(paginated.total / paginated.limit);
          
          return {
            success: true,
            data: paginated.data,
            pagination: {
              total: paginated.total,
              page: paginated.page,
              limit: paginated.limit,
              totalPages,
              hasNext: paginated.page < totalPages,
              hasPrev: paginated.page > 1,
            },
            timestamp: new Date().toISOString(),
            requestId,
          } as PaginatedResponseDto<T>;
        }

        // Standard success response
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          requestId,
        } as ApiResponseDto<T>;
      }),
    );
  }
}

