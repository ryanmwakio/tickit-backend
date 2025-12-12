import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode, PromoCodeType } from '../../database/entities/promo-code.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private promoCodeRepository: Repository<PromoCode>,
  ) {}

  async create(createDto: {
    organiserId: string;
    code: string;
    description?: string;
    type: PromoCodeType;
    value: number;
    validFrom?: Date;
    validUntil?: Date;
    maxUses?: number;
  }): Promise<PromoCode> {
    // Check if code already exists
    const existing = await this.promoCodeRepository.findOne({
      where: { code: createDto.code.toUpperCase(), organiserId: createDto.organiserId },
    });

    if (existing) {
      throw new BadRequestException('Promo code already exists');
    }

    const promoCode = this.promoCodeRepository.create({
      id: uuidv4(),
      ...createDto,
      code: createDto.code.toUpperCase(),
      usesCount: 0,
      isActive: true,
    });

    return this.promoCodeRepository.save(promoCode);
  }

  async findAll(organiserId?: string): Promise<PromoCode[]> {
    const where = organiserId ? { organiserId } : {};
    return this.promoCodeRepository.find({
      where,
      relations: ['organiser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id },
      relations: ['organiser'],
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found');
    }

    return promoCode;
  }

  async findByCode(code: string, organiserId?: string): Promise<PromoCode | null> {
    const where: any = { code: code.toUpperCase(), isActive: true };
    if (organiserId) {
      where.organiserId = organiserId;
    }

    return this.promoCodeRepository.findOne({
      where,
      relations: ['organiser'],
    });
  }

  async validate(code: string, organiserId: string, orderAmountCents: number): Promise<{
    valid: boolean;
    discountCents: number;
    promoCode?: PromoCode;
    error?: string;
  }> {
    const promoCode = await this.findByCode(code, organiserId);

    if (!promoCode) {
      return { valid: false, discountCents: 0, error: 'Promo code not found' };
    }

    // Check validity dates
    const now = new Date();
    if (promoCode.validFrom && promoCode.validFrom > now) {
      return { valid: false, discountCents: 0, error: 'Promo code not yet valid' };
    }

    if (promoCode.validUntil && promoCode.validUntil < now) {
      return { valid: false, discountCents: 0, error: 'Promo code has expired' };
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
      return { valid: false, discountCents: 0, error: 'Promo code usage limit reached' };
    }

    // Calculate discount
    let discountCents = 0;
    if (promoCode.type === PromoCodeType.PERCENTAGE) {
      discountCents = Math.floor((orderAmountCents * promoCode.value) / 100);
    } else if (promoCode.type === PromoCodeType.FIXED_AMOUNT) {
      discountCents = Math.floor(promoCode.value * 100); // value is in currency units
    }

    // Don't allow discount to exceed order amount
    if (discountCents > orderAmountCents) {
      discountCents = orderAmountCents;
    }

    return {
      valid: true,
      discountCents,
      promoCode,
    };
  }

  async apply(code: string, organiserId: string, orderAmountCents: number): Promise<{
    discountCents: number;
    promoCode: PromoCode;
  }> {
    const validation = await this.validate(code, organiserId, orderAmountCents);

    if (!validation.valid || !validation.promoCode) {
      throw new BadRequestException(validation.error || 'Invalid promo code');
    }

    // Increment usage count
    validation.promoCode.usesCount += 1;
    await this.promoCodeRepository.save(validation.promoCode);

    return {
      discountCents: validation.discountCents,
      promoCode: validation.promoCode,
    };
  }

  async update(id: string, updateDto: Partial<PromoCode>): Promise<PromoCode> {
    const promoCode = await this.findOne(id);
    Object.assign(promoCode, updateDto);
    return this.promoCodeRepository.save(promoCode);
  }

  async delete(id: string): Promise<void> {
    const promoCode = await this.findOne(id);
    promoCode.isActive = false;
    await this.promoCodeRepository.save(promoCode);
  }
}

