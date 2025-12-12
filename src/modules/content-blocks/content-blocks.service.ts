import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentBlock, ContentType } from '../../database/entities/content-block.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContentBlocksService {
  constructor(
    @InjectRepository(ContentBlock)
    private contentBlockRepository: Repository<ContentBlock>,
  ) {}

  async create(createDto: {
    key: string;
    section: string;
    category: string;
    content: string;
    type?: ContentType;
    locale?: string;
    metadata?: Record<string, any>;
  }, userId: string): Promise<ContentBlock> {
    const block = this.contentBlockRepository.create({
      id: uuidv4(),
      ...createDto,
      type: createDto.type || ContentType.TEXT,
      lastModifiedById: userId,
    });
    return this.contentBlockRepository.save(block);
  }

  async findAll(query: {
    section?: string;
    category?: string;
    locale?: string;
  }): Promise<ContentBlock[]> {
    return this.contentBlockRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ContentBlock> {
    const block = await this.contentBlockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException('Content block not found');
    }
    return block;
  }

  async findByKey(key: string, section?: string, locale?: string): Promise<ContentBlock | null> {
    const where: any = { key };
    if (section) where.section = section;
    if (locale) where.locale = locale;

    return this.contentBlockRepository.findOne({ where });
  }

  async update(id: string, updateDto: Partial<ContentBlock>, userId: string): Promise<ContentBlock> {
    const block = await this.findOne(id);
    Object.assign(block, updateDto);
    block.lastModifiedById = userId;
    return this.contentBlockRepository.save(block);
  }

  async delete(id: string): Promise<void> {
    const block = await this.findOne(id);
    await this.contentBlockRepository.remove(block);
  }
}

