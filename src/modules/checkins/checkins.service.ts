import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkin } from '../../database/entities/checkin.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(Checkin)
    private checkinRepository: Repository<Checkin>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async scanTicket(qrCode: string, staffId?: string, deviceId?: string, ipAddress?: string): Promise<{
    ticket: Ticket;
    checkin: Checkin;
    isDuplicate: boolean;
  }> {
    // Parse QR code to get ticket info
    let ticketData: { ticketNumber?: string; ticketId?: string } | null = null;
    try {
      const parsed: unknown = JSON.parse(Buffer.from(qrCode, 'base64').toString());
      if (typeof parsed === 'object' && parsed !== null) {
        ticketData = parsed as { ticketNumber?: string; ticketId?: string };
      }
    } catch {
      // Try direct lookup by QR code
      const ticket = await this.ticketRepository.findOne({
        where: { qrCode },
        relations: ['ticketType', 'ticketType.event', 'owner'],
      });

      if (!ticket) {
        throw new NotFoundException('Invalid ticket QR code');
      }

      return this.processCheckin(ticket, staffId, deviceId, ipAddress);
    }

    // Find ticket by ticket number or ID
    if (!ticketData || (!ticketData.ticketNumber && !ticketData.ticketId)) {
      throw new NotFoundException('Invalid ticket QR code format');
    }

    const ticket = await this.ticketRepository.findOne({
      where: [
        ...(ticketData.ticketNumber ? [{ ticketNumber: ticketData.ticketNumber }] : []),
        ...(ticketData.ticketId ? [{ id: ticketData.ticketId }] : []),
      ],
      relations: ['ticketType', 'ticketType.event', 'owner'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.processCheckin(ticket, staffId, deviceId, ipAddress);
  }

  private async processCheckin(
    ticket: Ticket,
    staffId?: string,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<{
    ticket: Ticket;
    checkin: Checkin;
    isDuplicate: boolean;
  }> {
    // Check if already checked in
    const existingCheckin = await this.checkinRepository.findOne({
      where: { ticketId: ticket.id },
      order: { createdAt: 'DESC' },
    });

    if (existingCheckin) {
      return {
        ticket,
        checkin: existingCheckin,
        isDuplicate: true,
      };
    }

    // Validate ticket status
    if (ticket.status !== TicketStatus.ACTIVE && ticket.status !== TicketStatus.TRANSFERRED) {
      throw new BadRequestException(`Ticket is ${ticket.status} and cannot be checked in`);
    }

    // Create checkin record
    const checkin = this.checkinRepository.create({
      id: uuidv4(),
      ticketId: ticket.id,
      staffId,
      deviceId,
      ipAddress,
    });

    const savedCheckin = await this.checkinRepository.save(checkin);

    // Update ticket status
    ticket.status = TicketStatus.CHECKED_IN;
    await this.ticketRepository.save(ticket);

    return {
      ticket,
      checkin: savedCheckin,
      isDuplicate: false,
    };
  }

  async getEventCheckins(
    eventId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Checkin[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticket.owner', 'owner')
      .leftJoinAndSelect('checkin.staff', 'staff')
      .where('ticketType.eventId = :eventId', { eventId })
      .orderBy('checkin.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [checkins, total] = await queryBuilder.getManyAndCount();

    return {
      data: checkins,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEventManifest(eventId: string): Promise<any[]> {
    const tickets = await this.ticketRepository.find({
      where: { ticketType: { eventId } },
      relations: ['owner', 'ticketType', 'orderItem', 'orderItem.order'],
    });

    return tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      ticketType: ticket.ticketType?.name || 'N/A',
      ownerName: ticket.owner ? `${ticket.owner.firstName} ${ticket.owner.lastName}` : 'N/A',
      ownerEmail: ticket.owner?.email || 'N/A',
      ownerPhone: ticket.owner?.phoneNumber || 'N/A',
      status: ticket.status,
      createdAt: ticket.createdAt,
    }));
  }
}

