import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ResaleService } from './resale.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../database/entities/user.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { PurchaseListingDto } from './dto/purchase-listing.dto';
import { ResaleQueryDto } from './dto/resale-query.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('resale')
@Controller('resale')
export class ResaleController {
  constructor(private readonly resaleService: ResaleService) {}

  @Post('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List ticket for resale' })
  @ApiResponse({ status: 201, description: 'Ticket listed for resale' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createListing(
    @Body() createListingDto: CreateListingDto,
    @CurrentUser() user: User,
  ) {
    const listing = await this.resaleService.createListing(
      createListingDto.ticketId,
      createListingDto.priceCents,
      user.id,
    );
    return { listing };
  }

  @Public()
  @Get('listings')
  @ApiOperation({ summary: 'Search resale listings' })
  @ApiResponse({ status: 200, description: 'Resale listings with pagination' })
  async findAll(@Query() query: ResaleQueryDto) {
    return this.resaleService.findAll({
      page: query.page || 1,
      limit: query.limit || 20,
      eventId: query.eventId,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
    });
  }

  @Post(':listingId/buy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Idempotency-Key', required: true, description: 'Idempotency key (UUID)' })
  @ApiOperation({ summary: 'Purchase resale ticket' })
  @ApiResponse({ status: 200, description: 'Purchase successful' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Conflict or duplicate request' })
  @HttpCode(HttpStatus.OK)
  async purchaseListing(
    @Param('listingId') listingId: string,
    @Body() purchaseDto: PurchaseListingDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
    @CurrentUser() user: User,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    return this.resaleService.purchaseListing(listingId, user.id, {
      method: purchaseDto.method,
      metadata: purchaseDto.metadata,
    }, idempotencyKey);
  }

  @Post(':listingId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel resale listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled' })
  @HttpCode(HttpStatus.OK)
  async cancelListing(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    await this.resaleService.cancelListing(params.id, user.id);
    return { cancelled: true };
  }
}

