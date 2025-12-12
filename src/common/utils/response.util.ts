import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';

/**
 * Helper utility to create standardized API responses
 */
export class ResponseUtil {
  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    message?: string,
    requestId?: string,
  ): ApiResponseDto<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    requestId?: string,
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Create a message-only success response
   */
  static message(message: string, requestId?: string): ApiResponseDto<null> {
    return {
      success: true,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
}

