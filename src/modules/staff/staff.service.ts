import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff, StaffStatus } from '../../database/entities/staff.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { User } from '../../database/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createDto: {
    userId: string;
    organiserId: string;
    department?: string;
    title?: string;
    permissions?: string[];
  }, ownerId: string): Promise<Staff> {
    // Verify organiser ownership
    const organiser = await this.organiserRepository.findOne({
      where: { id: createDto.organiserId, ownerId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found or access denied');
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if staff already exists
    const existing = await this.staffRepository.findOne({
      where: { userId: createDto.userId, organiserId: createDto.organiserId },
    });

    if (existing) {
      throw new BadRequestException('User is already a staff member');
    }

    const staff = this.staffRepository.create({
      id: uuidv4(),
      ...createDto,
      status: StaffStatus.ACTIVE,
    });

    return this.staffRepository.save(staff);
  }

  async findAll(organiserId?: string, ownerId?: string): Promise<Staff[]> {
    const where: any = {};
    if (organiserId) {
      where.organiserId = organiserId;
    }

    const staff = await this.staffRepository.find({
      where,
      relations: ['user', 'organiser'],
      order: { createdAt: 'DESC' },
    });

    // Filter by ownership if ownerId provided
    if (ownerId) {
      return staff.filter((s) => s.organiser?.ownerId === ownerId);
    }

    return staff;
  }

  async findOne(id: string, ownerId?: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: ['user', 'organiser'],
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    if (ownerId && staff.organiser?.ownerId !== ownerId) {
      throw new ForbiddenException('Access denied');
    }

    return staff;
  }

  async update(id: string, updateDto: Partial<Staff>, ownerId: string): Promise<Staff> {
    const staff = await this.findOne(id, ownerId);
    Object.assign(staff, updateDto);
    return this.staffRepository.save(staff);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const staff = await this.findOne(id, ownerId);
    await this.staffRepository.remove(staff);
  }
}

