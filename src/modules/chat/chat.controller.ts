import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../database/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @Public()
  @ApiOperation({ summary: 'Create or get chat session' })
  @ApiResponse({ status: 201, description: 'Session created or retrieved' })
  async createSession(
    @CurrentUser() user: User | undefined,
    @Body() dto?: CreateSessionDto,
  ) {
    return this.chatService.createOrGetSession(user?.id, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user chat sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getSessions(@CurrentUser() user: User) {
    return this.chatService.getUserSessions(user.id);
  }

  @Get('sessions/:id')
  @Public()
  @ApiOperation({ summary: 'Get chat session with messages' })
  @ApiResponse({ status: 200, description: 'Session retrieved' })
  async getSession(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    return this.chatService.getSession(id, user?.id);
  }

  @Post('sessions/:id/messages')
  @Public()
  @ApiOperation({ summary: 'Send message and get bot response' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: User | undefined,
  ) {
    return this.chatService.sendMessage(id, dto, user?.id);
  }

  @Patch('sessions/:id/read')
  @Public()
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    await this.chatService.markAsRead(id, user?.id);
    return { success: true };
  }

  @Patch('sessions/:id/close')
  @Public()
  @ApiOperation({ summary: 'Close chat session' })
  @ApiResponse({ status: 200, description: 'Session closed' })
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    return this.chatService.closeSession(id, user?.id);
  }

  // Agent endpoints
  @Get('admin/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chat sessions (admin/organizer)' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getAllSessions(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.chatService.getAllSessions({
      status: status as any,
      assignedToId,
      search,
    });
  }

  @Post('admin/sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send agent message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @HttpCode(HttpStatus.CREATED)
  async sendAgentMessage(
    @Param('id') id: string,
    @Body() dto: SendAgentMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.sendAgentMessage(id, user.id, dto.message);
  }

  @Patch('admin/sessions/:id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign session to agent' })
  @ApiResponse({ status: 200, description: 'Session assigned' })
  @HttpCode(HttpStatus.OK)
  async assignSession(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.assignSession(id, user.id);
  }

  @Get('admin/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread message count for agent' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.chatService.getUnreadCountForAgent(user.id);
    return { count };
  }
}

