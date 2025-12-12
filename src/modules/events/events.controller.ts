import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthInterceptor } from '../../common/interceptors/optional-auth.interceptor';
import { User } from '../../database/entities/user.entity';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List events with filters' })
  @ApiResponse({ status: 200, description: 'Events list', type: [EventResponseDto] })
  async findAll(@Query() query: EventQueryDto, @CurrentUser() user?: User) {
    return this.eventsService.findAll(query, user?.id);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get event by slug (explicit)' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: User) {
    return this.eventsService.findBySlug(slug, user?.id);
  }

  @Public()
  @UseInterceptors(OptionalAuthInterceptor)
  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID or slug' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventResponseDto })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') idOrSlug: string, @CurrentUser() user?: User) {
    return this.eventsService.findOne(idOrSlug, user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event (Organiser only)' })
  @ApiResponse({ status: 201, description: 'Event created', type: EventResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Body() createEventDto: CreateEventDto,
    @Query('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    if (!organiserId) {
      throw new Error('organiserId is required');
    }
    return this.eventsService.create(organiserId, createEventDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Event updated', type: EventResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partially update event (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Event updated', type: EventResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async patch(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event (Organiser only)' })
  @ApiResponse({ status: 204, description: 'Event deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.eventsService.delete(id, user.id);
  }

  @Post(':id/request-approval')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request approval for event (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Approval requested' })
  async requestApproval(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventsService.requestApproval(id, user.id);
  }
}

