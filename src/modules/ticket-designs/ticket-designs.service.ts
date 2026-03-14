import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketDesign } from '../../database/entities/ticket-design.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Event } from '../../database/entities/event.entity';
import { CreateTicketDesignDto } from './dto/create-ticket-design.dto';
import { UpdateTicketDesignDto } from './dto/update-ticket-design.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TicketDesignsService {
  constructor(
    @InjectRepository(TicketDesign)
    private ticketDesignRepository: Repository<TicketDesign>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(organiserId: string, createDto: CreateTicketDesignDto, userId: string): Promise<TicketDesign> {
    // Verify organiser ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    if (organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // If eventId is provided, verify event ownership
    if (createDto.eventId) {
      const event = await this.eventRepository.findOne({
        where: { id: createDto.eventId },
        relations: ['organiser'],
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (event.organiserId !== organiserId) {
        throw new ForbiddenException('Event does not belong to this organiser');
      }
    }

    // If setting as default, unset other defaults for this organiser
    if (createDto.isDefault) {
      await this.ticketDesignRepository.update(
        { organiserId, isDefault: true },
        { isDefault: false },
      );
    }

    const ticketDesign = this.ticketDesignRepository.create({
      id: uuidv4(),
      organiserId,
      eventId: createDto.eventId,
      name: createDto.name,
      description: createDto.description,
      designConfig: createDto.designConfig,
      isActive: true,
      isDefault: createDto.isDefault || false,
    });

    return this.ticketDesignRepository.save(ticketDesign);
  }

  async findAll(organiserId: string, eventId?: string): Promise<TicketDesign[]> {
    const where: any = { organiserId, isActive: true };
    if (eventId) {
      where.eventId = eventId;
    }

    return this.ticketDesignRepository.find({
      where,
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TicketDesign> {
    const ticketDesign = await this.ticketDesignRepository.findOne({
      where: { id },
      relations: ['organiser', 'event'],
    });

    if (!ticketDesign) {
      throw new NotFoundException('Ticket design not found');
    }

    return ticketDesign;
  }

  async update(id: string, updateDto: UpdateTicketDesignDto, userId: string): Promise<TicketDesign> {
    const ticketDesign = await this.findOne(id);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: ticketDesign.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // If setting as default, unset other defaults
    if (updateDto.isDefault === true) {
      await this.ticketDesignRepository.update(
        { organiserId: ticketDesign.organiserId, isDefault: true },
        { isDefault: false },
      );
    }

    await this.ticketDesignRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ticketDesign = await this.findOne(id);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: ticketDesign.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if design is in use
    const eventsUsingDesign = await this.eventRepository.count({
      where: { ticketDesignId: id },
    });

    if (eventsUsingDesign > 0) {
      throw new BadRequestException('Cannot delete ticket design that is in use by events');
    }

    await this.ticketDesignRepository.remove(ticketDesign);
  }

  async setAsDefault(id: string, userId: string): Promise<TicketDesign> {
    const ticketDesign = await this.findOne(id);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: ticketDesign.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Unset other defaults
    await this.ticketDesignRepository.update(
      { organiserId: ticketDesign.organiserId, isDefault: true },
      { isDefault: false },
    );

    // Set this as default
    await this.ticketDesignRepository.update(id, { isDefault: true });
    return this.findOne(id);
  }
}

