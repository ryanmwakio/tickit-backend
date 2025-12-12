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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganiserApplicationsService } from './organiser-applications.service';
import { CreateOrganiserApplicationDto } from './dto/create-application.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { OrganiserApplicationStatus } from '../../database/entities/organiser-application.entity';

@ApiTags('organiser-applications')
@Controller('organiser-applications')
export class OrganiserApplicationsController {
  constructor(private readonly applicationsService: OrganiserApplicationsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit organiser application (Public)' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 403, description: 'Pending application already exists' })
  async createApplication(
    @Body() createDto: CreateOrganiserApplicationDto,
    @CurrentUser() user?: User,
  ) {
    return this.applicationsService.createApplication({
      ...createDto,
      userId: user?.id,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organiser applications (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrganiserApplicationStatus })
  @ApiResponse({ status: 200, description: 'Applications list' })
  async getApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrganiserApplicationStatus,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return this.applicationsService.getApplications({
      page: pageNum,
      limit: limitNum,
      status,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplication(@Param('id') id: string) {
    return this.applicationsService.getApplication(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application approved' })
  async approveApplication(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body?: { notes?: string },
  ) {
    return this.applicationsService.approveApplication(id, user.id, body?.notes);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  async rejectApplication(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body?: { notes?: string },
  ) {
    return this.applicationsService.rejectApplication(id, user.id, body?.notes);
  }
}



