import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LiveStreamingService } from './live-streaming.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { StartStreamDto } from './dto/start-stream.dto';

@ApiTags('live-streaming')
@Controller('live-streaming')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveStreamingController {
  constructor(private readonly liveStreamingService: LiveStreamingService) {}

  @Post('events/:id/start')
  @ApiOperation({ summary: 'Start live streaming for an event (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Stream started' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async startStream(
    @Param() params: UuidParamDto,
    @Body() startStreamDto: StartStreamDto,
    @CurrentUser() user: User,
  ) {
    return this.liveStreamingService.startStream(
      params.id,
      user.id,
      startStreamDto.streamUrl,
    );
  }

  @Post('events/:id/mark-live')
  @ApiOperation({ summary: 'Mark stream as live (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Stream marked as live' })
  @HttpCode(HttpStatus.OK)
  async markStreamLive(
    @Param() params: UuidParamDto,
    @CurrentUser() user: User,
  ) {
    await this.liveStreamingService.markStreamLive(params.id, user.id);
    return { success: true };
  }

  @Post('events/:id/stop')
  @ApiOperation({ summary: 'Stop live streaming (Organiser only)' })
  @ApiResponse({ status: 200, description: 'Stream stopped' })
  @HttpCode(HttpStatus.OK)
  async stopStream(
    @Param() params: UuidParamDto,
    @CurrentUser() user: User,
  ) {
    await this.liveStreamingService.stopStream(params.id, user.id);
    return { success: true };
  }

  @Get('events/:id/info')
  @ApiOperation({ summary: 'Get live stream info' })
  @ApiResponse({ status: 200, description: 'Stream info' })
  async getStreamInfo(@Param() params: UuidParamDto) {
    return this.liveStreamingService.getStreamInfo(params.id);
  }
}

