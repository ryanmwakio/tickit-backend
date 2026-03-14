import { Controller, Get, Post, Param, Body, Query, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../database/entities/user.entity';
import { TicketStatus } from '../../database/entities/ticket.entity';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { VoidTicketDto } from './dto/void-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Public() // Allow unauthenticated access for guest users
  @Get()
  @ApiOperation({ summary: 'List user tickets (supports guest users with trackingId)' })
  @ApiResponse({ status: 200, description: 'Tickets list with pagination' })
  async findAll(
    @CurrentUser() user: User | undefined,
    @Query() query: TicketQueryDto,
  ) {
    const page: number = query.page ?? 1;
    const limit: number = query.limit ?? 20;
    const status: TicketStatus | undefined = query.status;
    const eventId: string | undefined = query.eventId;
    const trackingId: string | undefined = query.trackingId;
    
    // Explicitly call with all parameters to satisfy type checker
    return this.ticketsService.findAll(
      user?.id,
      page,
      limit,
      status,
      eventId,
      trackingId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async findOne(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    return this.ticketsService.findOne(params.id, user.id);
  }

  @Get('number/:ticketNumber')
  @ApiOperation({ summary: 'Get ticket by ticket number (owner only)' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findByTicketNumber(
    @Param('ticketNumber') ticketNumber: string,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.findByTicketNumber(ticketNumber, user.id);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer ticket to another user by email or phone' })
  @ApiResponse({ status: 200, description: 'Ticket transferred' })
  async transfer(
    @Param() params: UuidParamDto,
    @Body() transferDto: TransferTicketDto,
    @CurrentUser() user: User,
  ) {
    // Create transfer data object matching service signature
    const transferData: { email?: string; phoneNumber?: string } = {
      ...(transferDto.email && { email: transferDto.email }),
      ...(transferDto.phoneNumber && { phoneNumber: transferDto.phoneNumber }),
    };
    return this.ticketsService.transfer(
      params.id,
      transferData,
      user.id,
    );
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void a ticket' })
  @ApiResponse({ status: 200, description: 'Ticket voided' })
  async voidTicket(
    @Param() params: UuidParamDto,
    @Body() voidDto: VoidTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.voidTicket(params.id, voidDto.reason, user.id);
  }

  @Public() // Allow unauthenticated access for guest users
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download ticket as PDF (supports guest users)' })
  @ApiResponse({ status: 200, description: 'PDF file', content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async downloadPDF(
    @Param() params: UuidParamDto,
    @CurrentUser() user: User | undefined,
    @Res() res: Response,
  ) {
    // For guest users, userId will be undefined, which is handled by the service
    const pdfBuffer = await this.ticketsService.generateTicketPDF(params.id, user?.id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${params.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.send(pdfBuffer);
  }
}

