import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create promo code (Organiser/Admin only)' })
  @ApiResponse({ status: 201, description: 'Promo code created' })
  async create(@Body() createDto: CreatePromoCodeDto) {
    return this.promoCodesService.create({
      ...createDto,
      validFrom: createDto.validFrom ? new Date(createDto.validFrom) : undefined,
      validUntil: createDto.validUntil ? new Date(createDto.validUntil) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List promo codes' })
  @ApiResponse({ status: 200, description: 'Promo codes list' })
  async findAll(@Query('organiserId') organiserId?: string) {
    return this.promoCodesService.findAll(organiserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promo code by ID' })
  @ApiResponse({ status: 200, description: 'Promo code details' })
  async findOne(@Param() params: UuidParamDto) {
    return this.promoCodesService.findOne(params.id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate promo code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @HttpCode(HttpStatus.OK)
  async validate(@Body() validateDto: ValidatePromoCodeDto) {
    return this.promoCodesService.validate(
      validateDto.code,
      validateDto.organiserId,
      validateDto.orderAmountCents,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update promo code (Organiser/Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo code updated' })
  async update(@Param() params: UuidParamDto, @Body() updateDto: UpdatePromoCodeDto) {
    return this.promoCodesService.update(params.id, {
      ...updateDto,
      validFrom: updateDto.validFrom ? new Date(updateDto.validFrom) : undefined,
      validUntil: updateDto.validUntil ? new Date(updateDto.validUntil) : undefined,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANISER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete promo code (Organiser/Admin only)' })
  @ApiResponse({ status: 204, description: 'Promo code deleted' })
  async delete(@Param() params: UuidParamDto) {
    await this.promoCodesService.delete(params.id);
  }
}

