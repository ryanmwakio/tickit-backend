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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundQueryDto } from './dto/refund-query.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundsController {
  constructor(
    private readonly refundsService: RefundsService,
    @InjectRepository(Organiser)
    private readonly organiserRepository: Repository<Organiser>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Request refund for an order' })
  @ApiResponse({ status: 201, description: 'Refund request created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async create(
    @Body() createRefundDto: CreateRefundDto,
    @CurrentUser() user: User,
  ) {
    return this.refundsService.create(
      createRefundDto.orderId,
      createRefundDto.reason,
      user.id,
      createRefundDto.priority,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List refunds' })
  @ApiResponse({ status: 200, description: 'Refunds list with pagination' })
  async findAll(
    @Query() query: RefundQueryDto,
    @CurrentUser() user?: User,
  ) {
    return this.refundsService.findAll({
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status,
      orderId: query.orderId,
      userId: user?.id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund details' })
  @ApiResponse({ status: 200, description: 'Refund details' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  async findOne(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    return this.refundsService.findOne(params.id, user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANISER)
  @ApiOperation({ summary: 'Approve refund (Admin/Organiser only)' })
  @ApiResponse({ status: 200, description: 'Refund approved' })
  @HttpCode(HttpStatus.OK)
  async approve(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    const allowedOrganiserId = await this.getAllowedOrganiserIdForRefundAction(user);
    return this.refundsService.approve(params.id, user.id, allowedOrganiserId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANISER)
  @ApiOperation({ summary: 'Reject refund (Admin/Organiser only)' })
  @ApiResponse({ status: 200, description: 'Refund rejected' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param() params: UuidParamDto,
    @Body() rejectDto: RejectRefundDto,
    @CurrentUser() user: User,
  ) {
    const allowedOrganiserId = await this.getAllowedOrganiserIdForRefundAction(user);
    return this.refundsService.reject(params.id, user.id, rejectDto.reason, allowedOrganiserId);
  }

  /** When user is ORGANISER (not ADMIN), return their organiser id so refund is scoped to their events. */
  private async getAllowedOrganiserIdForRefundAction(user: User): Promise<string | undefined> {
    const roles = (user.roles ?? '')
      .split(',')
      .map((r) => r.trim().toUpperCase());
    const activeRole = user.activeRole ? String(user.activeRole).toUpperCase() : '';
    const isAdmin =
      roles.includes(String(UserRole.ADMIN)) || activeRole === String(UserRole.ADMIN);
    if (isAdmin) return undefined;
    const organiser = await this.organiserRepository.findOne({
      where: { ownerId: user.id },
    });
    if (!organiser) {
      throw new ForbiddenException(
        'Organiser profile required to approve or reject refunds',
      );
    }
    return organiser.id;
  }
}

