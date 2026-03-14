import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SeatMap } from '../../database/entities/seat-map.entity';
import { Seat, SeatStatus } from '../../database/entities/seat.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Event } from '../../database/entities/event.entity';
import { CreateSeatMapDto } from './dto/create-seat-map.dto';
import { UpdateSeatMapDto } from './dto/update-seat-map.dto';
import { CreateSeatsDto } from './dto/create-seats.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SeatMapsService {
  constructor(
    @InjectRepository(SeatMap)
    private seatMapRepository: Repository<SeatMap>,
    @InjectRepository(Seat)
    private seatRepository: Repository<Seat>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(organiserId: string, createDto: CreateSeatMapDto, userId: string): Promise<SeatMap> {
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

    // Verify event ownership
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

    // Check if event already has a seat map
    const existingSeatMap = await this.seatMapRepository.findOne({
      where: { eventId: createDto.eventId },
    });

    if (existingSeatMap) {
      throw new BadRequestException('Event already has a seat map');
    }

    const seatMap = this.seatMapRepository.create({
      id: uuidv4(),
      organiserId,
      eventId: createDto.eventId,
      name: createDto.name,
      description: createDto.description,
      mapConfig: createDto.mapConfig,
      isActive: true,
    });

    const savedSeatMap = await this.seatMapRepository.save(seatMap);

    // Update event to link seat map
    await this.eventRepository.update(createDto.eventId, {
      seatMapId: savedSeatMap.id,
    });

    return savedSeatMap;
  }

  async findAll(organiserId: string, eventId?: string): Promise<SeatMap[]> {
    const where: any = { organiserId, isActive: true };
    if (eventId) {
      where.eventId = eventId;
    }

    return this.seatMapRepository.find({
      where,
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, includeSeats: boolean = false): Promise<SeatMap> {
    const relations = ['organiser', 'event'];
    if (includeSeats) {
      relations.push('seats');
    }

    const seatMap = await this.seatMapRepository.findOne({
      where: { id },
      relations,
    });

    if (!seatMap) {
      throw new NotFoundException('Seat map not found');
    }

    return seatMap;
  }

  async update(id: string, updateDto: UpdateSeatMapDto, userId: string): Promise<SeatMap> {
    const seatMap = await this.findOne(id);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: seatMap.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.seatMapRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const seatMap = await this.findOne(id);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: seatMap.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if seats are sold
    const soldSeats = await this.seatRepository.count({
      where: { seatMapId: id, status: SeatStatus.SOLD },
    });

    if (soldSeats > 0) {
      throw new BadRequestException('Cannot delete seat map with sold seats');
    }

    // Remove seat map from event
    await this.eventRepository.update(seatMap.eventId, {
      seatMapId: undefined,
    });

    // Delete all seats
    await this.seatRepository.delete({ seatMapId: id });

    // Delete seat map
    await this.seatMapRepository.remove(seatMap);
  }

  async createSeats(createSeatsDto: CreateSeatsDto, userId: string): Promise<Seat[]> {
    const seatMap = await this.findOne(createSeatsDto.seatMapId);

    // Verify ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: seatMap.organiserId },
    });

    if (!organiser || organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const seats = createSeatsDto.seats.map((seatDto) =>
      this.seatRepository.create({
        id: uuidv4(),
        seatMapId: createSeatsDto.seatMapId,
        section: seatDto.section,
        row: seatDto.row,
        number: seatDto.number,
        positionX: seatDto.positionX,
        positionY: seatDto.positionY,
        priceCents: seatDto.priceCents,
        currency: seatDto.currency || 'KES',
        type: seatDto.type || 'standard',
        status: SeatStatus.AVAILABLE,
      }),
    );

    return this.seatRepository.save(seats);
  }

  async getSeats(seatMapId: string, status?: SeatStatus): Promise<Seat[]> {
    await this.findOne(seatMapId); // Verify seat map exists

    const where: any = { seatMapId };
    if (status) {
      where.status = status;
    }

    return this.seatRepository.find({
      where,
      order: { section: 'ASC', row: 'ASC', number: 'ASC' },
    });
  }

  async getAvailableSeats(seatMapId: string): Promise<Seat[]> {
    return this.getSeats(seatMapId, SeatStatus.AVAILABLE);
  }

  async reserveSeats(seatIds: string[], reservedBy: string, reservedUntil: Date): Promise<Seat[]> {
    const seats = await this.seatRepository.find({
      where: { id: In(seatIds) },
    });

    if (seats.length !== seatIds.length) {
      throw new NotFoundException('Some seats not found');
    }

    // Check if all seats are available
    const unavailableSeats = seats.filter(
      (seat) => seat.status !== SeatStatus.AVAILABLE,
    );

    if (unavailableSeats.length > 0) {
      throw new BadRequestException(
        `Seats ${unavailableSeats.map((s) => `${s.section}-${s.row}-${s.number}`).join(', ')} are not available`,
      );
    }

    // Reserve seats
    await this.seatRepository.update(
      { id: In(seatIds) },
      {
        status: SeatStatus.RESERVED,
        reservedBy,
        reservedUntil,
      },
    );

    return this.seatRepository.find({
      where: { id: In(seatIds) },
    });
  }

  async releaseReservation(seatIds: string[]): Promise<void> {
    await this.seatRepository.update(
      { id: In(seatIds), status: SeatStatus.RESERVED },
      {
        status: SeatStatus.AVAILABLE,
        reservedBy: undefined,
        reservedUntil: undefined,
      },
    );
  }

  async markSeatsAsSold(seatIds: string[], ticketId: string): Promise<void> {
    await this.seatRepository.update(
      { id: In(seatIds) },
      {
        status: SeatStatus.SOLD,
        ticketId,
        reservedBy: undefined,
        reservedUntil: undefined,
      },
    );
  }
}

