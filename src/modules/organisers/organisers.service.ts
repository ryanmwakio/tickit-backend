import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organiser } from '../../database/entities/organiser.entity';
import { CreateOrganiserDto } from './dto/create-organiser.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganisersService {
  constructor(
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
  ) {}

  async create(ownerId: string, createDto: CreateOrganiserDto): Promise<Organiser> {
    const organiser = this.organiserRepository.create({
      id: uuidv4(),
      ownerId,
      ...createDto,
    });
    return this.organiserRepository.save(organiser);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    ownerId?: string;
  }): Promise<{
    data: Organiser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, ownerId } = query;
    const where = ownerId ? { ownerId } : {};
    
    const [organisers, total] = await this.organiserRepository.findAndCount({
      where,
      relations: ['owner'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: organisers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<Organiser> {
    const organiser = await this.organiserRepository.findOne({
      where: { id },
      relations: ['owner', 'events'],
    });

    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    // Check access
    if (userId && organiser.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return organiser;
  }

  async update(id: string, updateDto: Partial<CreateOrganiserDto>, userId: string): Promise<Organiser> {
    const organiser = await this.findOne(id, userId);
    await this.organiserRepository.update(id, updateDto);
    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const organiser = await this.findOne(id, userId);
    await this.organiserRepository.remove(organiser);
  }
}

