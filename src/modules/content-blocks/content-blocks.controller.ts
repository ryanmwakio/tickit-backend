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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContentBlocksService } from './content-blocks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('content-blocks')
@Controller('content-blocks')
export class ContentBlocksController {
  constructor(private readonly contentBlocksService: ContentBlocksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List content blocks (public)' })
  @ApiResponse({ status: 200, description: 'Content blocks list' })
  async findAll(@Query() query: { section?: string; category?: string; locale?: string }) {
    return this.contentBlocksService.findAll(query);
  }

  @Public()
  @Get('key/:key')
  @ApiOperation({ summary: 'Get content block by key (public)' })
  @ApiResponse({ status: 200, description: 'Content block' })
  async findByKey(
    @Param('key') key: string,
    @Query('section') section: string,
    @Query('locale') locale: string,
  ) {
    return this.contentBlocksService.findByKey(key, section, locale);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create content block (Admin only)' })
  @ApiResponse({ status: 201, description: 'Content block created' })
  async create(@Body() createDto: any, @CurrentUser() user: User) {
    return this.contentBlocksService.create(createDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update content block (Admin only)' })
  @ApiResponse({ status: 200, description: 'Content block updated' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @CurrentUser() user: User,
  ) {
    return this.contentBlocksService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete content block (Admin only)' })
  @ApiResponse({ status: 204, description: 'Content block deleted' })
  async delete(@Param('id') id: string) {
    await this.contentBlocksService.delete(id);
  }
}

