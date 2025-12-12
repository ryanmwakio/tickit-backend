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
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANISER, UserRole.ADMIN)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Add staff member (Organiser/Admin only)' })
  @ApiResponse({ status: 201, description: 'Staff member added' })
  async create(@Body() createDto: CreateStaffDto, @CurrentUser() user: User) {
    return this.staffService.create(createDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List staff members' })
  @ApiResponse({ status: 200, description: 'Staff members list' })
  async findAll(
    @Query('organiserId') organiserId?: string,
    @CurrentUser() user?: User,
  ) {
    return this.staffService.findAll(organiserId, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by ID' })
  @ApiResponse({ status: 200, description: 'Staff member details' })
  async findOne(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    return this.staffService.findOne(params.id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update staff member' })
  @ApiResponse({ status: 200, description: 'Staff member updated' })
  async update(
    @Param() params: UuidParamDto,
    @Body() updateDto: UpdateStaffDto,
    @CurrentUser() user: User,
  ) {
    return this.staffService.update(params.id, updateDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove staff member' })
  @ApiResponse({ status: 204, description: 'Staff member removed' })
  async delete(@Param() params: UuidParamDto, @CurrentUser() user: User) {
    await this.staffService.delete(params.id, user.id);
  }
}

