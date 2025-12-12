import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      return this.findByEmail(identifier);
    }
    return this.findByPhone(identifier);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phoneNumber } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create({
      id: uuidv4(),
      ...userData,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findOne(id);
  }

  async toResponseDto(user: User): Promise<UserResponseDto> {
    // Load roles from relation if available, otherwise fall back to comma-separated string
    let roles: string[] = [];
    if (user.rolesList && user.rolesList.length > 0) {
      roles = user.rolesList.map((r) => r.name);
    } else if (user.roles) {
      roles = user.roles.split(',').map((r) => r.trim());
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      roles,
      activeRole: user.activeRole,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      preferredLanguage: user.preferredLanguage,
      notificationPreferences: user.notificationPreferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findOneWithRoles(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['rolesList'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

