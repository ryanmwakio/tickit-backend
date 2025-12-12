import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standardized API Success Response
 * All successful responses follow this structure
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response data payload' })
  data: T;

  @ApiPropertyOptional({ description: 'Optional message describing the result' })
  message?: string;

  @ApiProperty({ description: 'ISO 8601 timestamp of the response' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  requestId?: string;
}

/**
 * Pagination metadata
 */
export class PaginationMetadataDto {
  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number (1-indexed)' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

/**
 * Standardized Paginated Response
 * For list endpoints with pagination
 */
export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Array of items in current page' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;

  @ApiProperty({ description: 'ISO 8601 timestamp of the response' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  requestId?: string;
}

/**
 * Standardized Error Response
 * All error responses follow this structure
 */
export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Indicates the request failed', default: false })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Error type/category' })
  error?: string;

  @ApiPropertyOptional({ description: 'Detailed error information' })
  details?: any;

  @ApiPropertyOptional({ description: 'Validation errors (for 400 Bad Request)' })
  validationErrors?: Record<string, string[]>;

  @ApiProperty({ description: 'ISO 8601 timestamp of the error' })
  timestamp: string;

  @ApiProperty({ description: 'Request path that caused the error' })
  path: string;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  requestId?: string;
}

