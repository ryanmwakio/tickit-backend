import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings for the current user' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings(@CurrentUser() user: User) {
    // Return only user-specific settings, not defaults
    // This ensures settings start as unchecked/empty until explicitly set
    const settings = await this.settingsService.getAllSettings(user.id);
    return settings;
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings for the current user' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() settingsDto: Record<string, any>,
  ) {
    await this.settingsService.setMultipleSettings(user.id, settingsDto);
    return { message: 'Settings updated successfully' };
  }
}

