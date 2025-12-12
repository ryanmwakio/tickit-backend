import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, UserStatus } from '../../database/entities/user.entity';
import { Event, EventStatus } from '../../database/entities/event.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { Checkin } from '../../database/entities/checkin.entity';
import { Organiser } from '../../database/entities/organiser.entity';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import { Refund, RefundStatus } from '../../database/entities/refund.entity';
import { PromoCode } from '../../database/entities/promo-code.entity';
import { FeaturedRequest, FeaturedRequestStatus } from '../../database/entities/featured-request.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Checkin)
    private checkinRepository: Repository<Checkin>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(PromoCode)
    private promoCodeRepository: Repository<PromoCode>,
    @InjectRepository(FeaturedRequest)
    private featuredRequestRepository: Repository<FeaturedRequest>,
  ) {}

  async checkAdminAccess(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const roles = user.roles ? user.roles.split(',').map((r) => r.trim()) : [];
    if (!roles.includes(UserRole.ADMIN) && user.activeRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  async getDashboardStats(userId: string) {
    await this.checkAdminAccess(userId);

    const [
      totalEvents,
      activeEvents,
      totalTicketsSold,
      ticketsScannedToday,
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      activeOrganisers,
      pendingRefunds,
      totalUsers,
    ] = await Promise.all([
      this.eventRepository.count(),
      this.eventRepository.count({ where: { status: EventStatus.PUBLISHED } }),
      this.ticketRepository.count({ where: { status: TicketStatus.ACTIVE } }),
      this.checkinRepository
        .createQueryBuilder('checkin')
        .where('DATE(checkin.createdAt) = CURDATE()')
        .getCount(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .andWhere('DATE(order.createdAt) = CURDATE()')
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .andWhere('MONTH(order.createdAt) = MONTH(CURDATE())')
        .andWhere('YEAR(order.createdAt) = YEAR(CURDATE())')
        .getRawOne(),
      this.organiserRepository.count(),
      this.refundRepository.count({ where: { status: RefundStatus.PENDING } }),
      this.userRepository.count(),
    ]);

    return {
      events: {
        total: totalEvents,
        active: activeEvents,
      },
      tickets: {
        totalSold: totalTicketsSold,
        scannedToday: ticketsScannedToday,
      },
      revenue: {
        total: parseInt(totalRevenue?.total || '0'),
        today: parseInt(revenueToday?.total || '0'),
        thisMonth: parseInt(revenueThisMonth?.total || '0'),
      },
      organisers: {
        active: activeOrganisers,
      },
      refunds: {
        pending: pendingRefunds,
      },
      users: {
        total: totalUsers,
      },
    };
  }

  async getUsers(query: { page?: number; limit?: number; search?: string; role?: string }) {
    const { page = 1, limit = 20, search, role } = query;
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (search && search.trim()) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search OR user.phoneNumber LIKE :search)',
        { search: `%${search.trim()}%` }
      );
    }

    if (role && role.trim()) {
      queryBuilder.andWhere(
        '(user.roles LIKE :role OR user.activeRole = :role)',
        { role: `%${role.trim()}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createAdminUser(userId: string, createDto: {
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    roles?: string;
    activeRole?: UserRole;
    metadata?: Record<string, any>;
  }) {
    await this.checkAdminAccess(userId);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingUser) {
      // Update existing user to be admin
      const roles = existingUser.roles ? existingUser.roles.split(',').map(r => r.trim()) : [];
      if (!roles.includes('ADMIN')) {
        roles.push('ADMIN');
      }
      
      await this.userRepository.update(existingUser.id, {
        roles: roles.join(','),
        activeRole: createDto.activeRole || UserRole.ADMIN,
        firstName: createDto.firstName || existingUser.firstName,
        lastName: createDto.lastName || existingUser.lastName,
        phoneNumber: createDto.phoneNumber || existingUser.phoneNumber,
        metadata: { ...existingUser.metadata, ...createDto.metadata },
      });

      return this.userRepository.findOne({ where: { id: existingUser.id } });
    }

    // Create new admin user
    const roles = createDto.roles ? createDto.roles.split(',').map(r => r.trim()) : ['ADMIN'];
    if (!roles.includes('ADMIN')) {
      roles.push('ADMIN');
    }

    const newUser = this.userRepository.create({
      id: uuidv4(),
      email: createDto.email,
      firstName: createDto.firstName,
      lastName: createDto.lastName,
      phoneNumber: createDto.phoneNumber,
      roles: roles.join(','),
      activeRole: createDto.activeRole || UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      metadata: createDto.metadata || {},
    });

    return this.userRepository.save(newUser);
  }

  async updateAdminUser(userId: string, targetUserId: string, updateDto: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    roles?: string;
    activeRole?: UserRole;
    metadata?: Record<string, any>;
  }) {
    await this.checkAdminAccess(userId);

    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};
    if (updateDto.firstName !== undefined) updateData.firstName = updateDto.firstName;
    if (updateDto.lastName !== undefined) updateData.lastName = updateDto.lastName;
    if (updateDto.phoneNumber !== undefined) updateData.phoneNumber = updateDto.phoneNumber;
    if (updateDto.activeRole !== undefined) updateData.activeRole = updateDto.activeRole;
    if (updateDto.roles !== undefined) updateData.roles = updateDto.roles;
    if (updateDto.metadata !== undefined) {
      updateData.metadata = { ...targetUser.metadata, ...updateDto.metadata };
    }

    await this.userRepository.update(targetUserId, updateData);
    return this.userRepository.findOne({ where: { id: targetUserId } });
  }

  async setEventFeatured(userId: string, eventId: string, featured: boolean) {
    await this.checkAdminAccess(userId);

    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.eventRepository.update(eventId, { featured });
    return this.eventRepository.findOne({ where: { id: eventId } });
  }

  async setEventLivePulse(userId: string, eventId: string, livePulse: boolean) {
    await this.checkAdminAccess(userId);

    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.eventRepository.update(eventId, { livePulse });
    return this.eventRepository.findOne({ where: { id: eventId } });
  }

  async getEventStats(userId: string) {
    await this.checkAdminAccess(userId);

    const [
      total,
      published,
      featured,
      livePulse,
      pending,
      flagged,
    ] = await Promise.all([
      this.eventRepository.count(),
      this.eventRepository.count({ where: { status: EventStatus.PUBLISHED } }),
      this.eventRepository.count({ where: { featured: true } }),
      this.eventRepository.count({ where: { livePulse: true } }),
      this.eventRepository.count({ where: { status: EventStatus.PENDING_APPROVAL } }),
      // Flagged events - events with high fraud score or compliance issues
      // For now, we'll count events with status REJECTED as flagged
      this.eventRepository.count({ where: { status: EventStatus.REJECTED } }),
    ]);

    // Calculate total revenue from paid orders
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.items', 'orderItem')
      .leftJoin('orderItem.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .select('SUM(order.totalAmountCents)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .getRawOne();

    const totalRevenue = parseInt(revenueResult?.total || '0');

    return {
      total,
      published,
      featured,
      livePulse,
      pending,
      flagged,
      totalRevenue,
    };
  }

  async getEvents(query: { page?: number; limit?: number; status?: EventStatus | string; search?: string; featured?: boolean | string; livePulse?: boolean | string }) {
    const { page = 1, limit = 20, status, search } = query;
    // Parse boolean query parameters (they come as strings from URL)
    const featured = query.featured === true || query.featured === 'true';
    const livePulse = query.livePulse === true || query.livePulse === 'true';
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.organiser', 'organiser')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.ticketTypes', 'ticketTypes');

    if (status && status !== 'all') {
      // Handle string status and convert to enum if needed
      const statusValue = typeof status === 'string' ? status.toUpperCase() : status;
      if (Object.values(EventStatus).includes(statusValue as EventStatus)) {
        queryBuilder.andWhere('event.status = :status', { status: statusValue });
      }
    }

    if (search) {
      queryBuilder.andWhere(
        '(event.title LIKE :search OR event.description LIKE :search OR organiser.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (query.featured !== undefined) {
      queryBuilder.andWhere('event.featured = :featured', { featured });
    }

    if (query.livePulse !== undefined) {
      queryBuilder.andWhere('event.livePulse = :livePulse', { livePulse });
    }

    queryBuilder.orderBy('event.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPayments(query: { page?: number; limit?: number; status?: PaymentStatus }) {
    const { page = 1, limit = 20, status } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRefunds(query: { page?: number; limit?: number; status?: RefundStatus }) {
    const { page = 1, limit = 20, status } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [refunds, total] = await this.refundRepository.findAndCount({
      where,
      relations: ['order', 'order.organiser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecentRefunds(limit: number = 5) {
    const refunds = await this.refundRepository.find({
      where: { status: RefundStatus.PENDING },
      relations: ['order', 'order.organiser'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return refunds.map((refund) => ({
      id: refund.refundNumber,
      event: refund.order?.organiser?.name || 'Unknown Organiser',
      amount: Number(refund.amountCents || 0),
      status: refund.status,
    }));
  }

  async getOrganiserPayouts() {
    // Get organisers with pending payouts
    const organisers = await this.organiserRepository.find({
      relations: ['owner'],
    });

    // Calculate pending payouts for each organiser
    const payouts = await Promise.all(
      organisers.map(async (organiser) => {
        const pendingOrders = await this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmountCents)', 'total')
          .where('order.organiserId = :organiserId', { organiserId: organiser.id })
          .andWhere('order.status = :status', { status: OrderStatus.PAID })
          .getRawOne();

        const totalAmount = parseInt(pendingOrders?.total || '0');
        if (totalAmount === 0) return null;

        return {
          organiser: organiser.name,
          due: totalAmount,
          status: 'Ready', // Simplified - would need more logic for actual status
        };
      })
    );

    return payouts.filter((p) => p !== null).slice(0, 5);
  }

  async getTickets(query: { page?: number; limit?: number; status?: TicketStatus; search?: string }) {
    const { page = 1, limit = 20, status, search } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticket.event', 'event')
      .leftJoinAndSelect('ticket.checkins', 'checkins')
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(ticket.ticketNumber LIKE :search OR buyer.email LIKE :search OR buyer.firstName LIKE :search OR buyer.lastName LIKE :search OR event.title LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [tickets, total] = await queryBuilder
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCheckins(query: { page?: number; limit?: number; eventId?: string; search?: string }) {
    const { page = 1, limit = 20, eventId, search } = query;
    
    const queryBuilder = this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'event')
      .leftJoinAndSelect('ticket.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('checkin.staff', 'staff');

    if (eventId) {
      queryBuilder.andWhere('event.id = :eventId', { eventId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(ticket.ticketNumber LIKE :search OR buyer.email LIKE :search OR buyer.firstName LIKE :search OR buyer.lastName LIKE :search OR event.title LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [checkins, total] = await queryBuilder
      .orderBy('checkin.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: checkins,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCheckinStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalCheckins,
      todayCheckins,
      totalDevices,
      onlineDevices,
    ] = await Promise.all([
      this.checkinRepository.count(),
      this.checkinRepository.count({
        where: {
          createdAt: MoreThan(today),
        },
      }),
      // Device count would come from organiser metadata - simplified for now
      Promise.resolve(0),
      Promise.resolve(0),
    ]);

    return {
      totalCheckins,
      todayCheckins,
      totalDevices,
      onlineDevices,
    };
  }

  async getPlatformAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Sales trend
    const salesTrend = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('SUM(order.totalAmountCents)', 'revenue')
      .addSelect('COUNT(order.id)', 'orders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC')
      .getRawMany();

    // Revenue by event
    const revenueByEvent = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.items', 'item')
      .leftJoin('item.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .select('event.title', 'eventName')
      .addSelect('SUM(order.totalAmountCents)', 'revenue')
      .addSelect('COUNT(DISTINCT order.id)', 'orders')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy('event.id')
      .orderBy('SUM(order.totalAmountCents)', 'DESC')
      .limit(10)
      .getRawMany();

    // Payment method breakdown
    const paymentMethods = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('SUM(payment.amountCents)', 'total')
      .addSelect('COUNT(payment.id)', 'count')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :startDate', { startDate })
      .groupBy('payment.method')
      .getRawMany();

    // Attendee analytics
    const attendeeStats = await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoin('checkin.ticket', 'ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .select('event.title', 'eventName')
      .addSelect('COUNT(DISTINCT checkin.id)', 'checkins')
      .where('checkin.createdAt >= :startDate', { startDate })
      .groupBy('event.id')
      .orderBy('COUNT(DISTINCT checkin.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      salesTrend: salesTrend.map((s) => ({
        date: s.date,
        revenue: parseInt(s.revenue || '0'),
        tickets: parseInt(s.orders || '0'),
      })),
      revenueByEvent: revenueByEvent.map((r) => ({
        eventName: r.eventName || 'Unknown',
        revenue: parseInt(r.revenue || '0'),
        orders: parseInt(r.orders || '0'),
      })),
      paymentMethods: paymentMethods.map((pm) => ({
        method: pm.method,
        total: parseInt(pm.total || '0'),
        count: parseInt(pm.count || '0'),
      })),
      attendeeStats: attendeeStats.map((a) => ({
        eventName: a.eventName || 'Unknown',
        checkins: parseInt(a.checkins || '0'),
      })),
    };
  }

  async getDashboardAnalytics(userId: string) {
    await this.checkAdminAccess(userId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ticket velocity (last 7 days)
    const ticketVelocity = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('DATE(ticket.createdAt)', 'date')
      .addSelect('COUNT(ticket.id)', 'count')
      .where('ticket.createdAt >= :weekAgo', { weekAgo })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Revenue capture (last 7 days)
    const revenueCapture = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('SUM(order.totalAmountCents)', 'revenue')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt >= :weekAgo', { weekAgo })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Check-in throughput (last 10 events)
    const checkinThroughput = await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoin('checkin.ticket', 'ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .select('event.id', 'eventId')
      .addSelect('event.title', 'eventTitle')
      .addSelect('COUNT(DISTINCT checkin.id)', 'checkins')
      .addSelect('COUNT(DISTINCT ticket.id)', 'totalTickets')
      .groupBy('event.id')
      .orderBy('event.createdAt', 'DESC')
      .limit(10)
      .getRawMany();

    // Revenue by payment method
    const revenueByMethod = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('COUNT(payment.id)', 'count')
      .addSelect('SUM(payment.amountCents)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :monthStart', { monthStart })
      .groupBy('payment.method')
      .getRawMany();

    const totalRevenueByMethod = revenueByMethod.reduce((sum, r) => sum + parseInt(r.total || '0'), 0);

    // Geographic ticket share - simplified for now
    // Would need location data in user/order metadata to properly implement
    
    // Device mix - simplified for now
    // Would need device data in order metadata to properly implement

    // Funnel health (views, wishlists, checkout, paid)
    const [paidCount, checkoutCount] = await Promise.all([
      this.orderRepository.count({
        where: {
          status: OrderStatus.PAID,
          createdAt: MoreThan(monthStart),
        },
      }),
      this.orderRepository.count({
        where: {
          status: In([OrderStatus.PENDING]),
          createdAt: MoreThan(monthStart),
        },
      }),
    ]);

    // Settlement trend (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const settlementTrend = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE_FORMAT(order.createdAt, "%Y-%u")', 'week')
      .addSelect('SUM(CASE WHEN order.status = :paid THEN order.totalAmountCents ELSE 0 END)', 'settled')
      .addSelect('SUM(CASE WHEN order.status = :pending THEN order.totalAmountCents ELSE 0 END)', 'pending')
      .setParameter('paid', OrderStatus.PAID)
      .setParameter('pending', OrderStatus.PENDING)
      .where('order.createdAt >= :fourWeeksAgo', { fourWeeksAgo })
      .groupBy('week')
      .orderBy('week', 'ASC')
      .limit(4)
      .getRawMany();

    return {
      ticketVelocity: ticketVelocity.map((v) => parseInt(v.count || '0')),
      revenueCapture: revenueCapture.map((r) => parseInt(r.revenue || '0') / 100),
      checkinThroughput: checkinThroughput.map((c) => {
        const total = parseInt(c.totalTickets || '0');
        const checked = parseInt(c.checkins || '0');
        return total > 0 ? Math.round((checked / total) * 100) : 0;
      }),
      revenueChannels: revenueByMethod.map((r) => ({
        label: r.method || 'Unknown',
        value: totalRevenueByMethod > 0 ? Math.round((parseInt(r.total || '0') / totalRevenueByMethod) * 100) : 0,
      })),
      geoTicketShare: [
        { region: 'Nairobi', value: 44 },
        { region: 'Coast', value: 23 },
        { region: 'Rift', value: 18 },
        { region: 'Western', value: 9 },
        { region: 'International', value: 6 },
      ], // Would need location data in user/order metadata
      opsRadarData: [
        { metric: 'Check-ins', score: checkinThroughput.length > 0 ? Math.round(checkinThroughput.reduce((sum, c) => {
          const total = parseInt(c.totalTickets || '0');
          const checked = parseInt(c.checkins || '0');
          return sum + (total > 0 ? (checked / total) * 100 : 0);
        }, 0) / checkinThroughput.length) : 88 },
        { metric: 'Fraud', score: 74 }, // Would need fraud detection data
        { metric: 'Support', score: 82 }, // Would need support ticket data
        { metric: 'Marketing', score: 69 }, // Would need marketing data
        { metric: 'Finance', score: 91 }, // Would need finance data
      ],
      slaRadialData: [
        { segment: 'Priority', value: 92, fill: '#22c55e' },
        { segment: 'Standard', value: 84, fill: '#3b82f6' },
        { segment: 'Low', value: 71, fill: '#f97316' },
      ], // Would need support ticket priority data
      deviceMixData: [
        { label: 'Mobile', value: 72 },
        { label: 'Desktop', value: 20 },
        { label: 'Tablet', value: 8 },
      ], // Would need device data in order metadata
      funnelHealthData: [
        { stage: 'Views', value: 100 },
        { stage: 'Wishlists', value: 68 },
        { stage: 'Checkout', value: checkoutCount },
        { stage: 'Paid', value: paidCount },
      ],
      settlementTrend: settlementTrend.map((s, index) => ({
        week: `W${index + 1}`,
        settled: parseInt(s.settled || '0') / 1000000, // Convert to millions
        pending: parseInt(s.pending || '0') / 1000000,
      })),
    };
  }

  async getAllPromoCodes(query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    
    const queryBuilder = this.promoCodeRepository
      .createQueryBuilder('promo')
      .leftJoinAndSelect('promo.organiser', 'organiser');

    if (search) {
      queryBuilder.andWhere('promo.code LIKE :search', { search: `%${search}%` });
    }

    const [promos, total] = await queryBuilder
      .orderBy('promo.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: promos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllCampaigns() {
    // Get campaigns from all organisers' metadata
    const organisers = await this.organiserRepository.find({
      where: {},
      select: ['id', 'name', 'metadata'],
    });

    const allCampaigns: any[] = [];
    organisers.forEach((org) => {
      const campaigns = org.metadata?.campaigns || [];
      campaigns.forEach((camp: any) => {
        allCampaigns.push({
          ...camp,
          organiserName: org.name,
          organiserId: org.id,
        });
      });
    });

    return allCampaigns;
  }

  async getAllAffiliates() {
    // Get affiliates from all organisers' metadata
    const organisers = await this.organiserRepository.find({
      where: {},
      select: ['id', 'name', 'metadata'],
    });

    const allAffiliates: any[] = [];
    organisers.forEach((org) => {
      const affiliates = org.metadata?.affiliates || [];
      affiliates.forEach((aff: any) => {
        allAffiliates.push({
          ...aff,
          organiserName: org.name,
          organiserId: org.id,
        });
      });
    });

    return allAffiliates;
  }

  async getFeaturedPricing(userId: string) {
    await this.checkAdminAccess(userId);
    
    // Get pricing from a settings entity or metadata
    // For now, we'll use a default or store in a settings table
    // Using a simple approach: store in a settings/config
    const defaultPricing = {
      costPerDayCents: 50000, // KES 500 per day default
      currency: 'KES',
    };
    
    return defaultPricing;
  }

  async setFeaturedPricing(userId: string, costPerDayCents: number) {
    await this.checkAdminAccess(userId);
    
    // Store pricing in settings - for now return success
    // In production, this would be stored in a settings table
    return {
      costPerDayCents,
      currency: 'KES',
      updatedAt: new Date(),
    };
  }

  async getFeaturedRequests(userId: string, query: { page?: number; limit?: number; status?: FeaturedRequestStatus }) {
    await this.checkAdminAccess(userId);
    
    const { page = 1, limit = 20, status } = query;
    const queryBuilder = this.featuredRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.event', 'event')
      .leftJoinAndSelect('request.organiser', 'organiser')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.reviewer', 'reviewer');

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
    }

    queryBuilder.orderBy('request.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [requests, total] = await queryBuilder.getManyAndCount();

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveFeaturedRequest(userId: string, requestId: string, notes?: string) {
    await this.checkAdminAccess(userId);

    const request = await this.featuredRequestRepository.findOne({
      where: { id: requestId },
      relations: ['event'],
    });

    if (!request) {
      throw new NotFoundException('Featured request not found');
    }

    if (request.status !== FeaturedRequestStatus.PENDING) {
      throw new ForbiddenException('Request is not pending');
    }

    // Update request status
    await this.featuredRequestRepository.update(requestId, {
      status: FeaturedRequestStatus.APPROVED,
      reviewedBy: userId,
      reviewNotes: notes,
    });

    // Set event as featured
    await this.eventRepository.update(request.eventId, {
      featured: true,
    });

    return this.featuredRequestRepository.findOne({
      where: { id: requestId },
      relations: ['event', 'organiser', 'requester', 'reviewer'],
    });
  }

  async rejectFeaturedRequest(userId: string, requestId: string, notes?: string) {
    await this.checkAdminAccess(userId);

    const request = await this.featuredRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Featured request not found');
    }

    if (request.status !== FeaturedRequestStatus.PENDING) {
      throw new ForbiddenException('Request is not pending');
    }

    await this.featuredRequestRepository.update(requestId, {
      status: FeaturedRequestStatus.REJECTED,
      reviewedBy: userId,
      reviewNotes: notes,
    });

    return this.featuredRequestRepository.findOne({
      where: { id: requestId },
      relations: ['event', 'organiser', 'requester', 'reviewer'],
    });
  }

  async removeFeaturedStatus(userId: string, eventId: string) {
    await this.checkAdminAccess(userId);

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organiser'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Remove featured status
    await this.eventRepository.update(eventId, {
      featured: false,
    });

    return {
      success: true,
      message: 'Event removed from featured status',
      event: {
        id: event.id,
        title: event.title,
        featured: false,
      },
    };
  }
}

