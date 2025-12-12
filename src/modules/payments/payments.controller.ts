import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { PaymentMethod, PaymentStatus } from '../../database/entities/payment.entity';
import { Public } from '../../common/decorators/public.decorator';
import { MpesaExpressDto } from './dto/mpesa-express.dto';
import { CardPaymentDto } from './dto/card-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async create(@Body() createDto: any) {
    return this.paymentsService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments' })
  @ApiResponse({ status: 200, description: 'Payments list' })
  async findAll(@Query('orderId') orderId: string) {
    return this.paymentsService.findAll(orderId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async findOne(@Param() params: UuidParamDto) {
    return this.paymentsService.findOne(params.id);
  }

  @Post('mpesa/express')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MPesa Express (STK Push) payment' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key for duplicate request prevention',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'MPesa payment initiated' })
  async mpesaExpress(
    @Body() mpesaDto: MpesaExpressDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    const result = await this.paymentsService.processMpesaExpress(
      mpesaDto.orderId,
      mpesaDto.phoneNumber,
      mpesaDto.amountCents,
    );
    return {
      checkoutToken: result.checkoutToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  @Post('mpesa/confirm')
  @Public()
  @ApiOperation({ summary: 'MPesa webhook confirmation handler' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  async mpesaConfirm(@Body() body: any) {
    // MPesa callback payload structure varies, handle accordingly
    // TODO: Verify MPesa signature
    const processed = await this.paymentsService.handleMpesaCallback(body);
    return { processed };
  }

  @Post('card')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process card payment' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key for duplicate request prevention',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Card payment processed' })
  async cardPayment(
    @Body() cardDto: CardPaymentDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    return this.paymentsService.processCardPayment(
      cardDto.orderId,
      cardDto.token,
      cardDto.amountCents,
    );
  }

  @Post('webhooks/:provider')
  @Public()
  @ApiOperation({ summary: 'Generic webhook receiver for payment providers' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async webhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const received = await this.paymentsService.handleWebhook(provider, body, headers);
    return { received };
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param() params: UuidParamDto,
    @Body() updateDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(params.id, updateDto.status, updateDto.transactionId);
  }
}

