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
import { OrganisersService } from './organisers.service';
import { CreateOrganiserDto } from './dto/create-organiser.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('organisers')
@Controller('organisers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganisersController {
  constructor(private readonly organisersService: OrganisersService) {}

  @Post()
  @ApiOperation({ summary: 'Create organiser' })
  @ApiResponse({ status: 201, description: 'Organiser created' })
  async create(@Body() createDto: CreateOrganiserDto, @CurrentUser() user: User) {
    return this.organisersService.create(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List organisers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organisers list with pagination' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: User,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return this.organisersService.findAll({
      page: pageNum,
      limit: limitNum,
      ownerId: user?.id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organiser by ID' })
  @ApiResponse({ status: 200, description: 'Organiser details' })
  @ApiResponse({ status: 404, description: 'Organiser not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.organisersService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organiser' })
  @ApiResponse({ status: 200, description: 'Organiser updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateOrganiserDto>,
    @CurrentUser() user: User,
  ) {
    return this.organisersService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organiser' })
  @ApiResponse({ status: 204, description: 'Organiser deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.organisersService.delete(id, user.id);
  }
}

