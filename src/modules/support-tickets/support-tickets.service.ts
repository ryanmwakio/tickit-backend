import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '../../database/entities/support-ticket.entity';
import { SupportTicketMessage } from '../../database/entities/support-ticket-message.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage)
    private messageRepository: Repository<SupportTicketMessage>,
  ) {}

  async create(createDto: {
    subject: string;
    description: string;
    category?: string;
    priority?: SupportTicketPriority;
    organiserId?: string;
  }, userId: string): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create({
      id: uuidv4(),
      userId,
      ...createDto,
      status: SupportTicketStatus.OPEN,
      priority: createDto.priority || SupportTicketPriority.MEDIUM,
    });
    return this.ticketRepository.save(ticket);
  }

  async findAll(userId?: string, organiserId?: string): Promise<SupportTicket[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (organiserId) where.organiserId = organiserId;

    return this.ticketRepository.find({
      where,
      relations: ['user', 'organiser', 'assignedTo', 'messages'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllAdmin(query: { page?: number; limit?: number; status?: SupportTicketStatus; search?: string }) {
    const { page = 1, limit = 20, status, search } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.organiser', 'organiser')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(ticket.subject LIKE :search OR ticket.description LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [tickets, total] = await queryBuilder
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['user', 'organiser', 'assignedTo', 'messages', 'messages.user'],
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (userId && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async addMessage(ticketId: string, message: string, userId: string, isInternal: boolean = false): Promise<SupportTicketMessage> {
    const ticket = await this.findOne(ticketId, userId);

    const messageEntity = this.messageRepository.create({
      id: uuidv4(),
      ticketId: ticket.id,
      userId,
      message,
      isInternal,
    });

    return this.messageRepository.save(messageEntity);
  }

  async updateStatus(id: string, status: SupportTicketStatus, userId: string): Promise<SupportTicket> {
    const ticket = await this.findOne(id, userId);
    ticket.status = status;
    return this.ticketRepository.save(ticket);
  }

  async assign(id: string, assignedToId: string, userId: string): Promise<SupportTicket> {
    const ticket = await this.findOne(id, userId);
    ticket.assignedToId = assignedToId;
    return this.ticketRepository.save(ticket);
  }
}

