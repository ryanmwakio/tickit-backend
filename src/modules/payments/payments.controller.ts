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
import { IntaSendCheckoutDto, IntaSendMpesaStkPushDto, IntaSendStatusDto } from './dto/intasend-payment.dto';
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

  @Get('webhooks/:provider')
  @Public()
  @ApiOperation({ summary: 'Generic callback receiver for payment providers (GET)' })
  @ApiResponse({ status: 200, description: 'Callback received' })
  async callback(
    @Param('provider') provider: string,
    @Query() query: any,
  ) {
    // IntaSend uses POST webhooks, not GET callbacks
    return { received: false };
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

  @Post('intasend/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize IntaSend checkout (supports card, M-Pesa)' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key for duplicate request prevention',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Checkout initialized' })
  async initializeIntasendCheckout(
    @Body() checkoutDto: IntaSendCheckoutDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @CurrentUser() user: User,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    const result = await this.paymentsService.initiateIntasendPayment(
      checkoutDto.orderId,
      {
        firstName: checkoutDto.firstName || user.firstName || checkoutDto.email.split('@')[0],
        lastName: checkoutDto.lastName || user.lastName || '',
        email: checkoutDto.email,
        phoneNumber: checkoutDto.phoneNumber || user.phoneNumber,
      },
      checkoutDto.amount * 100, // Convert to cents
      checkoutDto.method, // 'M-PESA' or 'CARD-PAYMENT'
      checkoutDto.redirectUrl,
    );
    return {
      paymentId: result.payment.id,
      invoiceId: result.invoiceId,
      checkoutUrl: result.checkoutUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  @Post('intasend/mpesa-stk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger IntaSend M-Pesa STK Push' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key for duplicate request prevention',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'M-Pesa STK Push initiated' })
  async intasendMpesaStk(
    @Body() stkDto: IntaSendMpesaStkPushDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    const result = await this.paymentsService.processMpesaExpress(
      stkDto.orderId,
      stkDto.phoneNumber,
      stkDto.amount * 100, // Convert to cents
      true, // Use IntaSend
    );
    return {
      invoiceId: result.invoiceId,
      checkoutToken: result.checkoutToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  @Get('intasend/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check IntaSend payment status by invoice ID' })
  @ApiResponse({ status: 200, description: 'Payment status' })
  async checkIntasendStatus(@Query('invoiceId') invoiceId: string) {
    return this.paymentsService.checkIntasendPaymentStatus(invoiceId);
  }

  @Post('webhooks/intasend')
  @Public()
  @ApiOperation({ summary: 'IntaSend webhook handler (POST request)' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async intasendWebhook(@Body() body: any, @Headers() headers: any) {
    const processed = await this.paymentsService.handleIntasendWebhook(body, headers);
    return { processed };
  }
}

