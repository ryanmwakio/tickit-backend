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
import { SeatMapsService } from './seat-maps.service';
import { CreateSeatMapDto } from './dto/create-seat-map.dto';
import { UpdateSeatMapDto } from './dto/update-seat-map.dto';
import { CreateSeatsDto } from './dto/create-seats.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('seat-maps')
@Controller('seat-maps')
export class SeatMapsController {
  constructor(private readonly seatMapsService: SeatMapsService) {}

  @Post('organisers/:organiserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create seat map (Organiser only)' })
  @ApiResponse({ status: 201, description: 'Seat map created' })
  async create(
    @Param('organiserId') organiserId: string,
    @Body() createDto: CreateSeatMapDto,
    @CurrentUser() user: User,
  ) {
    return this.seatMapsService.create(organiserId, createDto, user.id);
  }

  @Get('organisers/:organiserId')
  @Public()
  @ApiOperation({ summary: 'List seat maps for an organiser' })
  @ApiQuery({ name: 'eventId', required: false, description: 'Filter by event ID' })
  @ApiResponse({ status: 200, description: 'Seat maps list' })
  async findAll(
    @Param('organiserId') organiserId: string,
    @Query('eventId') eventId?: string,
  ) {
    return this.seatMapsService.findAll(organiserId, eventId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get seat map by ID' })
  @ApiQuery({ name: 'includeSeats', required: false, type: Boolean, description: 'Include seats in response' })
  @ApiResponse({ status: 200, description: 'Seat map details' })
  async findOne(
    @Param('id') id: string,
    @Query('includeSeats') includeSeats?: string,
  ) {
    return this.seatMapsService.findOne(id, includeSeats === 'true');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update seat map (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Seat map updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSeatMapDto,
    @CurrentUser() user: User,
  ) {
    return this.seatMapsService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete seat map (Organiser only)' })
  @ApiResponse({ status: 204, description: 'Seat map deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.seatMapsService.delete(id, user.id);
  }

  @Post(':id/seats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create seats for a seat map (Organiser only)' })
  @ApiResponse({ status: 201, description: 'Seats created' })
  async createSeats(
    @Param('id') seatMapId: string,
    @Body() createSeatsDto: Omit<CreateSeatsDto, 'seatMapId'>,
    @CurrentUser() user: User,
  ) {
    return this.seatMapsService.createSeats(
      { ...createSeatsDto, seatMapId },
      user.id,
    );
  }

  @Get(':id/seats')
  @Public()
  @ApiOperation({ summary: 'Get seats for a seat map' })
  @ApiQuery({ name: 'status', required: false, enum: ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED', 'DISABLED'] })
  @ApiResponse({ status: 200, description: 'Seats list' })
  async getSeats(
    @Param('id') seatMapId: string,
    @Query('status') status?: string,
  ) {
    if (status) {
      return this.seatMapsService.getSeats(seatMapId, status as any);
    }
    return this.seatMapsService.getSeats(seatMapId);
  }

  @Get(':id/seats/available')
  @Public()
  @ApiOperation({ summary: 'Get available seats for a seat map' })
  @ApiResponse({ status: 200, description: 'Available seats list' })
  async getAvailableSeats(@Param('id') seatMapId: string) {
    return this.seatMapsService.getAvailableSeats(seatMapId);
  }
}

