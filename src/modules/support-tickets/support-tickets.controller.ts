import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { SupportTicketStatus } from '../../database/entities/support-ticket.entity';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@ApiTags('support-tickets')
@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create support ticket' })
  @ApiResponse({ status: 201, description: 'Support ticket created' })
  async create(@Body() createDto: CreateSupportTicketDto, @CurrentUser() user: User) {
    return this.supportTicketsService.create(createDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List support tickets' })
  @ApiResponse({ status: 200, description: 'Support tickets list' })
  async findAll(
    @Query('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.supportTicketsService.findAll(user.id, organiserId);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all support tickets (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SupportTicketStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Support tickets list' })
  async findAllAdmin(@Query() query: any) {
    return this.supportTicketsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket by ID' })
  @ApiResponse({ status: 200, description: 'Support ticket details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.supportTicketsService.findOne(id, user.id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to support ticket' })
  @ApiResponse({ status: 201, description: 'Message added' })
  async addMessage(
    @Param('id') id: string,
    @Body('message') message: string,
    @Body('isInternal') isInternal: boolean,
    @CurrentUser() user: User,
  ) {
    return this.supportTicketsService.addMessage(id, message, user.id, isInternal);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update support ticket status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: SupportTicketStatus,
    @CurrentUser() user: User,
  ) {
    return this.supportTicketsService.updateStatus(id, status, user.id);
  }
}

