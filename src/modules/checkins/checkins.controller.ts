import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckinsService } from './checkins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TicketStatus } from '../../database/entities/ticket.entity';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { BatchScanDto } from './dto/batch-scan.dto';

@ApiTags('checkins')
@Controller('scanner')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Post('scan')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Scan ticket QR code for check-in' })
  @ApiResponse({ status: 200, description: 'Ticket scanned successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid ticket or already checked in',
  })
  async scanTicket(
    @Body() scanDto: ScanTicketDto,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    const ipAddress: string =
      (request as Request & { ip?: string }).ip ||
      request.socket?.remoteAddress ||
      'unknown';
    const result = await this.checkinsService.scanTicket(
      scanDto.code,
      user.id,
      undefined, // deviceId
      ipAddress || 'unknown',
    );

    return {
      ticket: result.ticket,
      checkin: result.checkin,
      valid:
        !result.isDuplicate &&
        result.ticket.status === TicketStatus.CHECKED_IN,
    };
  }

  @Post('batch-scan')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Batch upload scans (for offline sync)' })
  @ApiResponse({ status: 200, description: 'Batch scans processed' })
  async batchScan(
    @Body() batchScanDto: BatchScanDto,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    const ipAddress: string | undefined =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.socket?.remoteAddress) ||
      undefined;
    const results = await Promise.allSettled(
      batchScanDto.scans.map((scan) =>
        this.checkinsService.scanTicket(
          scan.code,
          user.id,
          undefined,
          ipAddress || 'unknown',
        ),
      ),
    );

    return {
      results: results.map((result, index) => ({
        code: batchScanDto.scans[index].code,
        status: result.status === 'fulfilled' ? 'accepted' : 'error',
        error:
          result.status === 'rejected'
            ? (result.reason as Error)?.message
            : undefined,
      })),
    };
  }

  @Get('events/:eventId/checkins')
  @Roles(UserRole.ORGANISER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get check-ins for an event' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiResponse({ status: 200, description: 'Check-ins list with pagination' })
  async getEventCheckins(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return this.checkinsService.getEventCheckins(eventId, pageNum, limitNum);
  }

  @Get('events/:eventId/manifest')
  @Roles(UserRole.ORGANISER, UserRole.STAFF, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get event manifest (CSV download)' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Response format (default: csv)',
  })
  @ApiResponse({ status: 200, description: 'Event manifest' })
  async getEventManifest(
    @Param('eventId') eventId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
  ): Promise<unknown> {
    const manifest = await this.checkinsService.getEventManifest(eventId);

    if (format === 'json') {
      return manifest;
    }

    // Return CSV format (frontend can convert or we can set proper headers)
    return manifest;
  }
}

