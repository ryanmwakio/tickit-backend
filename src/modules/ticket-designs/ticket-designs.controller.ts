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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TicketDesignsService } from './ticket-designs.service';
import { CreateTicketDesignDto } from './dto/create-ticket-design.dto';
import { UpdateTicketDesignDto } from './dto/update-ticket-design.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('ticket-designs')
@Controller('ticket-designs')
export class TicketDesignsController {
  constructor(private readonly ticketDesignsService: TicketDesignsService) {}

  @Post('organisers/:organiserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create ticket design (Organiser only)' })
  @ApiResponse({ status: 201, description: 'Ticket design created' })
  async create(
    @Param('organiserId') organiserId: string,
    @Body() createDto: CreateTicketDesignDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketDesignsService.create(organiserId, createDto, user.id);
  }

  @Get('organisers/:organiserId')
  @Public()
  @ApiOperation({ summary: 'List ticket designs for an organiser' })
  @ApiQuery({ name: 'eventId', required: false, description: 'Filter by event ID' })
  @ApiResponse({ status: 200, description: 'Ticket designs list' })
  async findAll(
    @Param('organiserId') organiserId: string,
    @Query('eventId') eventId?: string,
  ) {
    return this.ticketDesignsService.findAll(organiserId, eventId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get ticket design by ID' })
  @ApiResponse({ status: 200, description: 'Ticket design details' })
  async findOne(@Param('id') id: string) {
    return this.ticketDesignsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket design (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Ticket design updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTicketDesignDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketDesignsService.update(id, updateDto, user.id);
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set ticket design as default (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Ticket design set as default' })
  async setAsDefault(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ticketDesignsService.setAsDefault(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ticket design (Organiser only)' })
  @ApiResponse({ status: 204, description: 'Ticket design deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.ticketDesignsService.delete(id, user.id);
  }
}

