import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketTypesService } from './ticket-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('ticket-types')
@Controller('ticket-types')
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Public()
  @Get('events/:eventId')
  @ApiOperation({ summary: 'List ticket types for an event (public)' })
  @ApiResponse({ status: 200, description: 'Ticket types list' })
  async findAll(@Param('eventId') eventId: string) {
    return this.ticketTypesService.findAll(eventId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get ticket type by ID (public)' })
  @ApiResponse({ status: 200, description: 'Ticket type details' })
  async findOne(@Param('id') id: string) {
    return this.ticketTypesService.findOne(id);
  }

  @Post('events/:eventId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create ticket type (Organiser only)' })
  @ApiResponse({ status: 201, description: 'Ticket type created' })
  async create(
    @Param('eventId') eventId: string,
    @Body() createDto: any,
    @CurrentUser() user: User,
  ) {
    return this.ticketTypesService.create(eventId, createDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket type (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Ticket type updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @CurrentUser() user: User,
  ) {
    return this.ticketTypesService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ticket type (Organiser only)' })
  @ApiResponse({ status: 204, description: 'Ticket type deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.ticketTypesService.delete(id, user.id);
  }
}

