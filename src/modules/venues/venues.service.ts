import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Venue } from '../../database/entities/venue.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
  ) {}

  async create(createDto: {
    name: string;
    description?: string;
    address: string;
    city: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    capacity?: number;
    amenities?: Record<string, any>;
    imageUrls?: string[];
  }): Promise<Venue> {
    const venue = this.venueRepository.create({
      id: uuidv4(),
      ...createDto,
      country: createDto.country || 'Kenya',
    });
    return this.venueRepository.save(venue);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    city?: string;
    search?: string;
    organiserId?: string;
  }): Promise<{
    data: Venue[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, city, search, organiserId } = query;
    const where: any = {};
    
    if (city) where.city = city;
    if (search) {
      where.name = Like(`%${search}%`);
    }
    if (organiserId) {
      // Note: Venues don't have organiserId directly, this would need a join
      // For now, we'll skip this filter
    }

    const [venues, total] = await this.venueRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: venues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['events'],
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async update(id: string, updateDto: Partial<Venue>): Promise<Venue> {
    await this.venueRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const venue = await this.findOne(id);
    await this.venueRepository.remove(venue);
  }
}

