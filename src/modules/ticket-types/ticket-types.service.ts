import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketType } from '../../database/entities/ticket-type.entity';
import { Event } from '../../database/entities/event.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketTypesService {
  constructor(
    @InjectRepository(TicketType)
    private ticketTypeRepository: Repository<TicketType>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(eventId: string, createDto: {
    name: string;
    description?: string;
    priceCents: number;
    currency?: string;
    quantityTotal: number;
    minPerOrder?: number;
    maxPerOrder?: number;
    isRefundable?: boolean;
    salesStartsAt?: Date;
    salesEndsAt?: Date;
    metadata?: Record<string, any>;
  }, userId: string): Promise<TicketType> {
    // Verify event ownership
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser'],
    });

    if (!event || !event.organiser) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const ticketType = this.ticketTypeRepository.create({
      id: uuidv4(),
      eventId,
      ...createDto,
      currency: createDto.currency || 'KES',
      isRefundable: createDto.isRefundable ?? true,
      quantitySold: 0,
    });

    return this.ticketTypeRepository.save(ticketType);
  }

  async findAll(eventId: string): Promise<TicketType[]> {
    return this.ticketTypeRepository.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TicketType> {
    const ticketType = await this.ticketTypeRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    return ticketType;
  }

  async update(id: string, updateDto: Partial<TicketType>, userId: string): Promise<TicketType> {
    const ticketType = await this.findOne(id);

    // Verify ownership
    const event = await this.eventRepository.findOne({
      where: { id: ticketType.eventId },
      relations: ['organiser'],
    });

    if (!event || !event.organiser || event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.ticketTypeRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ticketType = await this.findOne(id);

    // Verify ownership
    const event = await this.eventRepository.findOne({
      where: { id: ticketType.eventId },
      relations: ['organiser'],
    });

    if (!event || !event.organiser || event.organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.ticketTypeRepository.remove(ticketType);
  }
}

