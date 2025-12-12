import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../database/entities/chat-session.entity';
import { ChatMessage, MessageSenderType } from '../../database/entities/chat-message.entity';
import { ChatBotService } from './services/chat-bot.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    private botService: ChatBotService,
    private wsGateway: WebSocketGateway,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create or get existing chat session
   */
  async createOrGetSession(userId?: string, dto?: CreateSessionDto): Promise<ChatSession> {
    // Try to find existing active session for user
    if (userId) {
      const existingSession = await this.sessionRepository.findOne({
        where: {
          userId,
          status: ChatSessionStatus.ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });

      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session
    const session = this.sessionRepository.create({
      id: uuidv4(),
      userId,
      guestId: !userId ? uuidv4() : undefined,
      guestName: dto?.guestName,
      guestEmail: dto?.guestEmail,
      metadata: dto?.metadata,
      status: ChatSessionStatus.ACTIVE,
    });

    const saved = await this.sessionRepository.save(session);

    // Send welcome message from bot - ensure sessionId is valid
    if (!saved || !saved.id) {
      this.logger.error(`Failed to save session or session has no id`);
      throw new Error('Failed to create chat session');
    }

    const sessionId = String(saved.id).trim();
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      this.logger.error(`Invalid saved session id: ${saved.id}`);
      throw new Error('Invalid session ID after creation');
    }

    const welcomeMessage = this.botService.getWelcomeMessage();
    await this.createMessage(sessionId, {
      message: welcomeMessage,
      senderType: MessageSenderType.BOT,
    });

    return saved;
  }

  /**
   * Get session with messages
   */
  async getSession(sessionId: string, userId?: string): Promise<ChatSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['messages', 'user', 'assignedTo'],
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Verify access
    if (userId && session.userId && session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    // Sort messages by creation date
    if (session.messages) {
      session.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return session;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return this.sessionRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });
  }

  /**
   * Send a message and get bot response
   */
  async sendMessage(sessionId: string, dto: CreateMessageDto, userId?: string): Promise<{ userMessage: ChatMessage; botMessage?: ChatMessage }> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    this.logger.debug(`sendMessage called with sessionId: ${sessionId}, userId: ${userId}`);

    const session = await this.getSession(sessionId, userId);

    if (!session) {
      this.logger.error(`Session not found for sessionId: ${sessionId}`);
      throw new NotFoundException('Chat session not found');
    }

    if (!session.id) {
      this.logger.error(`Session found but has no id property. Session object:`, JSON.stringify(session, null, 2));
      throw new NotFoundException('Chat session has invalid id');
    }

    this.logger.debug(`Session found: ${session.id} (type: ${typeof session.id})`);

    // Create user message - ensure we're using the session.id string value
    const actualSessionId = String(session.id).trim();
    if (!actualSessionId || actualSessionId === 'null' || actualSessionId === 'undefined') {
      this.logger.error(`Invalid session.id value: ${session.id} (type: ${typeof session.id})`);
      throw new Error(`Invalid session ID: ${session.id}`);
    }

    this.logger.debug(`Creating message with actualSessionId: ${actualSessionId}`);

    const userMessage = await this.createMessage(actualSessionId, {
      message: dto.message,
      senderType: MessageSenderType.USER,
      userId,
    });

    // Update session
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    // Send real-time update via WebSocket
    this.wsGateway.broadcastToRoom(`chat:${sessionId}`, 'chat:message', {
      id: userMessage.id,
      message: userMessage.message,
      senderType: userMessage.senderType,
      createdAt: userMessage.createdAt,
      userId: userMessage.userId,
    });

    // Get bot response (async, non-blocking)
    let botMessage: ChatMessage | undefined;
    try {
      // Load conversation history from database
      const existingMessages = await this.messageRepository.find({
        where: { sessionId },
        order: { createdAt: 'ASC' },
        take: 20, // Get last 20 messages for context
      });

      // Build conversation history (exclude the message we just created)
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      const recentMessages = existingMessages
        .filter((m) => m.id !== userMessage.id)
        .slice(-10); // Use last 10 for AI context

      for (const msg of recentMessages) {
        if (msg.senderType === MessageSenderType.USER) {
          conversationHistory.push({ role: 'user', content: msg.message });
        } else if (msg.senderType === MessageSenderType.BOT || msg.senderType === MessageSenderType.AGENT) {
          conversationHistory.push({ role: 'assistant', content: msg.message });
        }
      }

      // Get bot response - this will fallback to rule-based if AI fails
      const botResponse = await this.botService.processMessage(dto.message, {
        userId: session.userId || undefined,
        sessionId: actualSessionId, // Use validated sessionId
        conversationHistory,
      });

      // Create bot message - use the validated actualSessionId
      // Ensure we have a valid sessionId before creating the message
      if (!actualSessionId || actualSessionId.trim() === '') {
        this.logger.error(`Cannot create bot message: invalid sessionId: ${actualSessionId}`);
        throw new Error('Invalid session ID for bot message');
      }

      botMessage = await this.createMessage(actualSessionId, {
        message: botResponse.message,
        senderType: MessageSenderType.BOT,
        metadata: {
          quickReplies: botResponse.quickReplies,
          intent: botResponse.intent,
          confidence: botResponse.confidence,
          ...botResponse.metadata,
        },
      });

      // Send real-time bot response via WebSocket
      this.wsGateway.broadcastToRoom(`chat:${sessionId}`, 'chat:message', {
        id: botMessage.id,
        message: botMessage.message,
        senderType: botMessage.senderType,
        metadata: botMessage.metadata,
        createdAt: botMessage.createdAt,
      });

      // If bot suggests escalation, notify support team
      if (botResponse.escalate && session.userId) {
        this.notificationsService.createNotification({
          userId: session.userId,
          title: 'Chat Escalation',
          message: 'Your chat has been escalated to our support team. An agent will respond shortly.',
          type: NotificationType.ORGANIZER_MESSAGE,
          metadata: {
            sessionId,
            link: `/chat/${sessionId}`,
          },
        }).catch((err) => {
          this.logger.warn(`Failed to create escalation notification: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error(`Failed to generate bot response: ${error.message}`);
    }

    return { userMessage, botMessage };
  }

  /**
   * Create a chat message
   */
  private async createMessage(
    sessionId: string,
    data: {
      message: string;
      senderType: MessageSenderType;
      userId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ChatMessage> {
    if (!sessionId || sessionId.trim() === '') {
      this.logger.error(`Invalid sessionId provided: ${sessionId}`);
      throw new Error('Session ID is required to create a message');
    }

    this.logger.debug(`Creating message for session: ${sessionId}, message: ${data.message.substring(0, 50)}`);

    const messageId = uuidv4();
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;
    const isReadValue = data.senderType === MessageSenderType.BOT ? 1 : 0;

    this.logger.debug(`Inserting message with params:`, {
      messageId,
      sessionId,
      message: data.message.substring(0, 50),
      senderType: data.senderType,
      userId: data.userId || 'null',
      metadata: metadataJson ? 'present' : 'null',
      isRead: isReadValue,
    });

    try {
      // Double-check sessionId is valid
      if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
        this.logger.error(`Invalid sessionId: ${sessionId} (type: ${typeof sessionId})`);
        throw new Error(`Invalid sessionId: ${sessionId}`);
      }

      // Use repository manager to execute raw SQL with explicit column names
      // This bypasses TypeORM's property-to-column mapping issues
      const queryParams = [
        messageId,
        sessionId,
        data.message,
        data.senderType,
        data.userId || null,
        metadataJson,
        isReadValue,
      ];

      this.logger.debug(`Executing INSERT with params:`, queryParams.map((p, i) => {
        const paramNames = ['messageId', 'sessionId', 'message', 'senderType', 'userId', 'metadata', 'isRead'];
        return `${paramNames[i]}: ${p === null ? 'NULL' : (typeof p === 'string' ? `'${p.substring(0, 20)}...'` : p)}`;
      }));

      // Verify all parameters before executing
      this.logger.debug(`About to execute INSERT with sessionId: "${sessionId}" (length: ${sessionId?.length}, type: ${typeof sessionId})`);
      
      if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
        throw new Error(`Invalid sessionId: ${sessionId}`);
      }

      // Create entity instance and save it directly
      // This ensures TypeORM handles the column mapping correctly
      this.logger.debug(`Raw values before creating entity:`, {
        messageId: `${messageId} (${typeof messageId})`,
        sessionId: `${sessionId} (${typeof sessionId}, length: ${sessionId?.length})`,
        message: `${data.message.substring(0, 30)}...`,
        senderType: `${data.senderType} (${typeof data.senderType})`,
        userId: `${data.userId || 'NULL'} (${typeof data.userId})`,
        metadataJson: `${metadataJson ? 'present' : 'NULL'}`,
        isReadValue: `${isReadValue} (${typeof isReadValue})`,
      });

      try {
        // Create the message entity with all fields explicitly set
        const messageEntity = this.messageRepository.create({
          id: messageId,
          sessionId: sessionId, // CRITICAL: Explicitly set sessionId
          message: data.message,
          senderType: data.senderType,
          userId: data.userId || undefined,
          metadata: data.metadata || undefined,
          isRead: isReadValue === 1,
        });

        // Log the created entity to verify sessionId is set
        this.logger.debug(`Created entity:`, {
          id: messageEntity.id,
          sessionId: messageEntity.sessionId,
          sessionIdType: typeof messageEntity.sessionId,
          hasSessionId: 'sessionId' in messageEntity,
        });

        // Save the entity
        const savedMessage = await this.messageRepository.save(messageEntity);

        this.logger.debug(`Message saved successfully. ID: ${savedMessage.id}, sessionId: ${savedMessage.sessionId}`);
        
        return savedMessage;
      } catch (saveError: any) {
        this.logger.error(`Save failed:`, {
          error: saveError?.message,
          stack: saveError?.stack,
          sessionId: sessionId,
          sessionIdType: typeof sessionId,
          sessionIdLength: sessionId?.length,
          rawSessionId: JSON.stringify(sessionId),
        });
        throw saveError;
      }
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`, error.stack);
      this.logger.error(`Failed with sessionId: ${sessionId}, messageId: ${messageId}`);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(sessionId: string, userId?: string): Promise<void> {
    await this.messageRepository.update(
      {
        sessionId,
        senderType: MessageSenderType.USER,
        isRead: false,
      },
      { isRead: true },
    );
  }

  /**
   * Close chat session
   */
  async closeSession(sessionId: string, userId?: string): Promise<ChatSession> {
    const session = await this.getSession(sessionId, userId);
    session.status = ChatSessionStatus.CLOSED;
    return this.sessionRepository.save(session);
  }

  /**
   * Escalate to human agent
   */
  async escalateToAgent(sessionId: string, agentId: string): Promise<ChatSession> {
    const session = await this.getSession(sessionId);
    session.status = ChatSessionStatus.ESCALATED;
    session.assignedToId = agentId;
    return this.sessionRepository.save(session);
  }

  /**
   * Get all chat sessions (for admin/organizer)
   */
  async getAllSessions(filters?: {
    status?: ChatSessionStatus;
    assignedToId?: string;
    search?: string;
  }): Promise<ChatSession[]> {
    const query = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('session.assignedTo', 'assignedTo')
      .orderBy('session.updatedAt', 'DESC');

    if (filters?.status) {
      query.andWhere('session.status = :status', { status: filters.status });
    }

    if (filters?.assignedToId) {
      query.andWhere('session.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
    }

    if (filters?.search) {
      query.andWhere(
        '(session.guestName LIKE :search OR session.guestEmail LIKE :search OR user.email LIKE :search OR user.name LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  /**
   * Send agent message
   */
  async sendAgentMessage(sessionId: string, agentId: string, message: string): Promise<ChatMessage> {
    const session = await this.getSession(sessionId);
    
    // Auto-escalate if not already escalated
    if (session.status !== ChatSessionStatus.ESCALATED) {
      session.status = ChatSessionStatus.ESCALATED;
      session.assignedToId = agentId;
      await this.sessionRepository.save(session);
    }

    // Create agent message
    const agentMessage = await this.createMessage(sessionId, {
      message,
      senderType: MessageSenderType.AGENT,
      userId: agentId,
    });

    // Update session
    session.updatedAt = new Date();
    await this.sessionRepository.save(session);

    // Send real-time update via WebSocket
    this.wsGateway.broadcastToRoom(`chat:${sessionId}`, 'chat:message', {
      id: agentMessage.id,
      message: agentMessage.message,
      senderType: agentMessage.senderType,
      userId: agentMessage.userId,
      createdAt: agentMessage.createdAt,
    });

    // Notify user if they have a userId
    if (session.userId) {
      this.notificationsService.createNotification({
        userId: session.userId,
        title: 'New Message from Support',
        message: 'You have a new message from our support team.',
        type: NotificationType.ORGANIZER_MESSAGE,
        metadata: {
          sessionId,
          link: `/chat/${sessionId}`,
        },
      }).catch((err) => {
        this.logger.warn(`Failed to notify user of agent message: ${err.message}`);
      });
    }

    return agentMessage;
  }

  /**
   * Assign session to agent
   */
  async assignSession(sessionId: string, agentId: string): Promise<ChatSession> {
    const session = await this.getSession(sessionId);
    session.status = ChatSessionStatus.ESCALATED;
    session.assignedToId = agentId;
    return this.sessionRepository.save(session);
  }

  /**
   * Get unread message count for agent
   */
  async getUnreadCountForAgent(agentId?: string): Promise<number> {
    const query = this.messageRepository.createQueryBuilder('message')
      .leftJoin('message.session', 'session')
      .where('message.senderType = :senderType', { senderType: MessageSenderType.USER })
      .andWhere('message.isRead = :isRead', { isRead: false });

    if (agentId) {
      query.andWhere('(session.assignedToId = :agentId OR session.assignedToId IS NULL)', { agentId });
    }

    return query.getCount();
  }

  /**
   * Get unread count for a specific session
   */
  async getUnreadCountForSession(sessionId: string): Promise<number> {
    return this.messageRepository.count({
      where: {
        sessionId,
        senderType: MessageSenderType.USER,
        isRead: false,
      },
    });
  }
}

