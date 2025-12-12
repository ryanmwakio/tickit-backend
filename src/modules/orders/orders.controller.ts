import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { ResendTicketsDto } from './dto/resend-tickets.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @Public()
  @ApiOperation({ summary: 'Create order and initiate checkout (supports guest checkout)' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key for duplicate request prevention',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Order created and checkout initiated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Seat unavailable or conflict' })
  async checkout(
    @Body() checkoutDto: CheckoutDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @Req() request: Request,
  ) {
    if (!idempotencyKey) {
      throw new Error('X-Idempotency-Key header is required');
    }
    const buyerId = user?.id || undefined;
    return this.ordersService.checkout(buyerId, checkoutDto, idempotencyKey, request.ip);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order (legacy endpoint)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'organiserId', required: false, type: String, description: 'Filter by organiser ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by order status' })
  @ApiResponse({ status: 200, description: 'Orders list with pagination' })
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('organiserId') organiserId?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return this.ordersService.findAll(user.id, organiserId, pageNum, limitNum, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user.id);
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Resend tickets via email/SMS' })
  @ApiResponse({ status: 200, description: 'Tickets resent' })
  async resendTickets(
    @Param() params: UuidParamDto,
    @Body() resendDto: ResendTicketsDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.resendTickets(params.id, user.id, resendDto.method);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark order as paid and generate tickets (legacy)' })
  @ApiResponse({ status: 200, description: 'Order paid and tickets generated' })
  async markAsPaid(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    return this.ordersService.markAsPaid(params.id, user.id);
  }
}

