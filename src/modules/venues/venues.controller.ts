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
import { VenuesService } from './venues.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List venues (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'organiserId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Venues list with pagination' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('organiserId') organiserId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return this.venuesService.findAll({
      page: pageNum,
      limit: limitNum,
      city,
      search,
      organiserId,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get venue by ID (public)' })
  @ApiResponse({ status: 200, description: 'Venue details' })
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create venue (Admin/Organiser only)' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  async create(@Body() createDto: any) {
    return this.venuesService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANISER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update venue (Admin/Organiser only)' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.venuesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete venue (Admin only)' })
  @ApiResponse({ status: 204, description: 'Venue deleted' })
  async delete(@Param('id') id: string) {
    await this.venuesService.delete(id);
  }
}

