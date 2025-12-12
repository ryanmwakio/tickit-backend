import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Organiser } from '../../database/entities/organiser.entity';
import { Event, EventStatus } from '../../database/entities/event.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Ticket } from '../../database/entities/ticket.entity';
import { Checkin } from '../../database/entities/checkin.entity';
import { Payment, PaymentStatus } from '../../database/entities/payment.entity';
import { Refund, RefundStatus } from '../../database/entities/refund.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { FeaturedRequest, FeaturedRequestStatus } from '../../database/entities/featured-request.entity';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { RealtimeNotificationService } from '../../common/services/realtime-notification.service';
import { NotificationType as NotificationPayloadType } from '../../common/types/notification.types';
import { NotificationType } from '../../database/entities/notification.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class OrganiserDashboardService {
  private readonly logger = new Logger(OrganiserDashboardService.name);

  constructor(
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Checkin)
    private checkinRepository: Repository<Checkin>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FeaturedRequest)
    private featuredRequestRepository: Repository<FeaturedRequest>,
    private notificationsService: NotificationsService,
    private realtimeNotificationService: RealtimeNotificationService,
  ) {}

  async verifyAccess(organiserId: string, userId: string): Promise<void> {
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId, ownerId: userId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found or access denied');
    }
  }

  async getDashboardStats(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    const [
      ticketsSoldToday,
      grossRevenue,
      outstandingPayouts,
      checkInRate,
      upcomingEvents,
      totalEvents,
    ] = await Promise.all([
      this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoin('ticket.ticketType', 'ticketType')
        .leftJoin('ticketType.event', 'event')
        .where('event.organiserId = :organiserId', { organiserId })
        .andWhere('DATE(ticket.createdAt) = CURDATE()')
        .getCount(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.organiserId = :organiserId', { organiserId })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.organiserId = :organiserId', { organiserId })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(), // TODO: Calculate actual outstanding based on payout schedule
      this.getCheckInRate(organiserId),
      this.eventRepository.count({
        where: { organiserId, status: EventStatus.PUBLISHED },
      }),
      this.eventRepository.count({ where: { organiserId } }),
    ]);

    return {
      ticketsSoldToday,
      grossRevenue: parseInt(grossRevenue?.total || '0'),
      outstandingPayouts: parseInt(outstandingPayouts?.total || '0'),
      checkInRate,
      upcomingEvents,
      totalEvents,
    };
  }

  private async getCheckInRate(organiserId: string): Promise<number> {
    const totalTickets = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .where('event.organiserId = :organiserId', { organiserId })
      .andWhere('ticket.status = :status', { status: 'ACTIVE' })
      .getCount();

    const checkedIn = await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoin('checkin.ticket', 'ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .leftJoin('ticketType.event', 'event')
      .where('event.organiserId = :organiserId', { organiserId })
      .getCount();

    return totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;
  }

  async getEvents(organiserId: string, userId: string, status?: EventStatus) {
    await this.verifyAccess(organiserId, userId);

    const where: any = { organiserId };
    if (status) {
      where.status = status;
    }

    return this.eventRepository.find({
      where,
      relations: ['venue', 'ticketTypes'],
      order: { startsAt: 'ASC' },
    });
  }

  async getOrders(organiserId: string, userId: string, skip: number = 0, take: number = 9) {
    await this.verifyAccess(organiserId, userId);

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { organiserId },
      relations: ['buyer', 'organiser', 'items', 'items.ticketType', 'items.ticketType.event', 'items.tickets', 'payments'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return {
      data: orders,
      total,
      hasMore: skip + take < total,
    };
  }

  async getRefunds(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    return this.refundRepository.find({
      where: { order: { organiserId } },
      relations: [
        'order',
        'order.buyer',
        'order.organiser',
        'order.items',
        'order.items.ticketType',
        'order.items.ticketType.event',
        'order.items.tickets',
        'order.payments',
        'processedBy',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getCustomers(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get all orders for this organiser with buyer info
    const orders = await this.orderRepository.find({
      where: { organiserId },
      relations: [
        'buyer',
        'items',
        'items.ticketType',
        'items.ticketType.event',
        'items.tickets',
        'payments',
      ],
      order: { createdAt: 'DESC' },
    });

    // Group orders by buyer
    const customerMap = new Map<string, {
      buyer: User;
      orders: Order[];
      totalSpent: number;
      lastOrderDate: Date;
    }>();

    for (const order of orders) {
      if (!order.buyerId || !order.buyer) continue;

      const buyerId = order.buyerId;
      if (!customerMap.has(buyerId)) {
        customerMap.set(buyerId, {
          buyer: order.buyer,
          orders: [],
          totalSpent: 0,
          lastOrderDate: order.createdAt,
        });
      }

      const customer = customerMap.get(buyerId)!;
      customer.orders.push(order);
      
      if (order.status === OrderStatus.PAID) {
        // Convert bigint/string to number safely to avoid string concatenation
        let amountCents: number;
        const rawAmount = order.totalAmountCents;
        
        if (typeof rawAmount === 'bigint') {
          amountCents = Number(rawAmount);
        } else if (typeof rawAmount === 'string') {
          amountCents = parseFloat(rawAmount) || 0;
        } else if (typeof rawAmount === 'number') {
          amountCents = rawAmount;
        } else {
          amountCents = 0;
        }
        
        // Ensure we're doing numeric addition, not string concatenation
        customer.totalSpent = Number(customer.totalSpent || 0) + Number(amountCents || 0);
      }
      
      if (order.createdAt > customer.lastOrderDate) {
        customer.lastOrderDate = order.createdAt;
      }
    }

    // Convert to array and format response
    return Array.from(customerMap.values()).map(({ buyer, orders, totalSpent, lastOrderDate }) => ({
      id: buyer.id,
      name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || buyer.email || 'Guest',
      email: buyer.email || '',
      phone: buyer.phoneNumber || '',
      location: buyer.metadata?.location || null,
      totalOrders: orders.length,
      totalSpent: (totalSpent || 0) / 100, // Convert cents to currency, default to 0 if null
      lastOrderDate: lastOrderDate.toISOString(),
      status: buyer.metadata?.blocked ? 'blocked' : buyer.metadata?.flagged ? 'flagged' : 'active',
      orders: orders.slice(0, 5), // Return first 5 orders for preview
      allOrders: orders, // Include all orders for detailed view
    }));
  }

  async updateCustomer(organiserId: string, userId: string, customerId: string, updateData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    metadata?: Record<string, any>;
  }) {
    await this.verifyAccess(organiserId, userId);

    // Verify customer has orders with this organiser
    const hasOrders = await this.orderRepository.findOne({
      where: { organiserId, buyerId: customerId },
    });

    if (!hasOrders) {
      throw new ForbiddenException('Customer not found or no orders with this organiser');
    }

    const user = await this.userRepository.findOne({ where: { id: customerId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Update user fields
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;
    if (updateData.metadata !== undefined) {
      user.metadata = { ...user.metadata, ...updateData.metadata };
    }

    return this.userRepository.save(user);
  }

  async blockCustomer(organiserId: string, userId: string, customerId: string, blocked: boolean) {
    await this.verifyAccess(organiserId, userId);

    // Verify customer has orders with this organiser
    const hasOrders = await this.orderRepository.findOne({
      where: { organiserId, buyerId: customerId },
    });

    if (!hasOrders) {
      throw new ForbiddenException('Customer not found or no orders with this organiser');
    }

    const user = await this.userRepository.findOne({ where: { id: customerId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Update blocked status in metadata
    if (!user.metadata) user.metadata = {};
    user.metadata.blocked = blocked;
    if (blocked) {
      user.metadata.blockedBy = userId;
      user.metadata.blockedAt = new Date().toISOString();
    } else {
      delete user.metadata.blockedBy;
      delete user.metadata.blockedAt;
    }

    return this.userRepository.save(user);
  }

  async getCheckInStats(organiserId: string, userId: string, eventId?: string) {
    await this.verifyAccess(organiserId, userId);

    // Get all events for this organiser
    const eventsQuery = this.eventRepository
      .createQueryBuilder('event')
      .where('event.organiserId = :organiserId', { organiserId });
    
    if (eventId) {
      eventsQuery.andWhere('event.id = :eventId', { eventId });
    }

    const events = await eventsQuery.getMany();
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      return {
        totalScanned: 0,
        totalExpected: 0,
        duplicateScans: 0,
        fraudAttempts: 0,
        totalThroughput: 0,
        checkInRate: 0,
      };
    }

    // Get total expected tickets (ACTIVE or TRANSFERRED status)
    const totalExpected = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .where('ticketType.eventId IN (:...eventIds)', { eventIds })
      .andWhere('ticket.status IN (:...statuses)', { statuses: ['ACTIVE', 'TRANSFERRED'] })
      .getCount();

    // Get all check-ins for these events
    const checkins = await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('checkin.staff', 'staff')
      .where('ticketType.eventId IN (:...eventIds)', { eventIds })
      .orderBy('checkin.createdAt', 'DESC')
      .getMany();

    // Count duplicates (multiple check-ins for same ticket)
    const ticketCheckinCount = new Map<string, number>();
    checkins.forEach(checkin => {
      const count = ticketCheckinCount.get(checkin.ticketId) || 0;
      ticketCheckinCount.set(checkin.ticketId, count + 1);
    });
    const duplicateScans = Array.from(ticketCheckinCount.values())
      .filter(count => count > 1)
      .reduce((sum, count) => sum + (count - 1), 0);

    // Calculate throughput (scans in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCheckins = checkins.filter(c => new Date(c.createdAt) >= oneHourAgo);
    const totalThroughput = recentCheckins.length; // scans per hour, convert to per minute if needed

    return {
      totalScanned: checkins.length,
      totalExpected,
      duplicateScans,
      fraudAttempts: 0, // TODO: Implement fraud detection
      totalThroughput: Math.round(totalThroughput / 60), // Convert to per minute
      checkInRate: totalExpected > 0 ? (checkins.length / totalExpected) * 100 : 0,
    };
  }

  async getGateActivity(organiserId: string, userId: string, eventId?: string) {
    await this.verifyAccess(organiserId, userId);

    // Get registered gates
    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    const registeredGates = (organiser?.metadata?.gates as any[]) || [];

    // Get all events for this organiser
    const eventsQuery = this.eventRepository
      .createQueryBuilder('event')
      .where('event.organiserId = :organiserId', { organiserId });
    
    if (eventId) {
      eventsQuery.andWhere('event.id = :eventId', { eventId });
    }

    const events = await eventsQuery.getMany();
    const eventIds = events.map(e => e.id);

    if (eventIds.length === 0) {
      // Return registered gates even if no events
      return registeredGates.map((gate: any) => ({
        gateId: gate.id,
        gateName: gate.name,
        scannedCount: 0,
        expectedCount: 0,
        duplicateScans: 0,
        fraudAttempts: 0,
        throughput: 0,
        status: gate.status === 'inactive' ? 'error' : 'active',
        lastScan: new Date().toISOString(),
        staff: [],
      }));
    }

    // Get check-ins grouped by deviceId (gates)
    const checkins = await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('checkin.staff', 'staff')
      .where('ticketType.eventId IN (:...eventIds)', { eventIds })
      .orderBy('checkin.createdAt', 'DESC')
      .getMany();

    // Group by deviceId (or use 'default' if no deviceId)
    const gateMap = new Map<string, {
      gateId: string;
      gateName: string;
      scannedCount: number;
      expectedCount: number;
      duplicateScans: number;
      fraudAttempts: number;
      throughput: number;
      status: 'active' | 'warning' | 'error';
      lastScan: string;
      staff: Array<{ id: string; name: string; scans: number; deviceId: string }>;
    }>();

    // First, add registered gates
    registeredGates.forEach((gate: any) => {
      gateMap.set(gate.id, {
        gateId: gate.id,
        gateName: gate.name,
        scannedCount: 0,
        expectedCount: 0,
        duplicateScans: 0,
        fraudAttempts: 0,
        throughput: 0,
        status: gate.status === 'inactive' ? 'error' : 'active',
        lastScan: new Date().toISOString(),
        staff: [],
      });
    });

    // Get expected count per gate (for now, distribute evenly)
    const totalExpected = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.ticketType', 'ticketType')
      .where('ticketType.eventId IN (:...eventIds)', { eventIds })
      .andWhere('ticket.status IN (:...statuses)', { statuses: ['ACTIVE', 'TRANSFERRED'] })
      .getCount();

    checkins.forEach(checkin => {
      const deviceId = checkin.deviceId || 'default';
      const gateId = `gate-${deviceId}`;
      
      // Only create new gate from check-in if not already registered
      if (!gateMap.has(gateId)) {
        gateMap.set(gateId, {
          gateId,
          gateName: deviceId === 'default' ? 'General Gate' : `Gate ${deviceId}`,
          scannedCount: 0,
          expectedCount: totalExpected, // For now, all gates see same expected count
          duplicateScans: 0,
          fraudAttempts: 0,
          throughput: 0,
          status: 'active',
          lastScan: checkin.createdAt.toISOString(),
          staff: [],
        });
      }

      // Update gate with check-in data
      const gate = gateMap.get(gateId)!;
      if (gate.expectedCount === 0) {
        gate.expectedCount = totalExpected;
      }
      gate.scannedCount++;
      if (new Date(checkin.createdAt) > new Date(gate.lastScan)) {
        gate.lastScan = checkin.createdAt.toISOString();
      }

      // Track staff activity
      if (checkin.staffId && checkin.staff) {
        const staffName = `${checkin.staff.firstName || ''} ${checkin.staff.lastName || ''}`.trim() || checkin.staff.email || 'Unknown';
        let staffMember = gate.staff.find(s => s.id === checkin.staffId);
        if (!staffMember) {
          staffMember = {
            id: checkin.staffId,
            name: staffName,
            scans: 0,
            deviceId: deviceId,
          };
          gate.staff.push(staffMember);
        }
        staffMember.scans++;
      }
    });

    // Calculate duplicates and throughput per gate
    const ticketCheckinCount = new Map<string, Map<string, number>>(); // ticketId -> gateId -> count
    checkins.forEach(checkin => {
      const deviceId = checkin.deviceId || 'default';
      const gateId = `gate-${deviceId}`;
      if (!ticketCheckinCount.has(checkin.ticketId)) {
        ticketCheckinCount.set(checkin.ticketId, new Map());
      }
      const gateCounts = ticketCheckinCount.get(checkin.ticketId)!;
      const count = gateCounts.get(gateId) || 0;
      gateCounts.set(gateId, count + 1);
    });

    gateMap.forEach((gate, gateId) => {
      let duplicates = 0;
      ticketCheckinCount.forEach((gateCounts) => {
        const count = gateCounts.get(gateId) || 0;
        if (count > 1) {
          duplicates += (count - 1);
        }
      });
      gate.duplicateScans = duplicates;

      // Calculate throughput (scans in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCheckins = checkins.filter(
        c => (c.deviceId || 'default') === gateId.replace('gate-', '') && new Date(c.createdAt) >= oneHourAgo
      );
      gate.throughput = Math.round(recentCheckins.length / 60); // per minute

      // Determine status
      const checkInRate = gate.expectedCount > 0 ? (gate.scannedCount / gate.expectedCount) * 100 : 0;
      if (checkInRate < 50) {
        gate.status = 'warning';
      } else if (gate.duplicateScans > 10 || gate.fraudAttempts > 0) {
        gate.status = 'error';
      } else {
        gate.status = 'active';
      }
    });

    return Array.from(gateMap.values());
  }

  async getDeviceStatus(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get registered devices
    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    const registeredDevices = (organiser?.metadata?.devices as any[]) || [];

    // Get all events for this organiser
    const events = await this.eventRepository.find({
      where: { organiserId },
    });
    const eventIds = events.map(e => e.id);

    // Get check-ins grouped by deviceId
    const checkins = eventIds.length > 0 ? await this.checkinRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.ticket', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .where('ticketType.eventId IN (:...eventIds)', { eventIds })
      .orderBy('checkin.createdAt', 'DESC')
      .getMany() : [];

    // Group by deviceId
    const deviceMap = new Map<string, {
      deviceId: string;
      deviceName: string;
      gateId: string;
      gateName: string;
      batteryLevel: number;
      connectionStatus: 'online' | 'offline' | 'syncing';
      lastSync: string;
      firmwareVersion: string;
      scanCount: number;
    }>();

    // First, add registered devices
    registeredDevices.forEach((device: any) => {
      deviceMap.set(device.deviceId, {
        deviceId: device.deviceId,
        deviceName: device.deviceName || `Device ${device.deviceId}`,
        gateId: device.gateId ? `gate-${device.gateId}` : `gate-${device.deviceId}`,
        gateName: device.gateName || (device.gateId ? `Gate ${device.gateId}` : 'General Gate'),
        batteryLevel: device.batteryLevel || 100,
        connectionStatus: device.connectionStatus || 'offline',
        lastSync: device.lastSync || new Date().toISOString(),
        firmwareVersion: device.firmwareVersion || 'v2.1.0',
        scanCount: 0,
      });
    });

    // Then, process check-ins
    checkins.forEach(checkin => {
      const deviceId = checkin.deviceId || 'default';
      
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          deviceId,
          deviceName: deviceId === 'default' ? 'Default Device' : `Device ${deviceId}`,
          gateId: `gate-${deviceId}`,
          gateName: deviceId === 'default' ? 'General Gate' : `Gate ${deviceId}`,
          batteryLevel: 100,
          connectionStatus: 'online',
          lastSync: checkin.createdAt.toISOString(),
          firmwareVersion: 'v2.1.0',
          scanCount: 0,
        });
      }

      const device = deviceMap.get(deviceId)!;
      device.scanCount++;
      if (new Date(checkin.createdAt) > new Date(device.lastSync)) {
        device.lastSync = checkin.createdAt.toISOString();
      }

      // Determine connection status based on last sync time
      const lastSyncTime = new Date(device.lastSync).getTime();
      const now = Date.now();
      const timeSinceSync = now - lastSyncTime;
      if (timeSinceSync > 5 * 60 * 1000) { // 5 minutes
        device.connectionStatus = 'offline';
      } else if (timeSinceSync > 2 * 60 * 1000) { // 2 minutes
        device.connectionStatus = 'syncing';
      } else {
        device.connectionStatus = 'online';
      }
    });

    return Array.from(deviceMap.values());
  }

  async registerDevice(organiserId: string, userId: string, deviceData: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    gateId?: string;
    permissions: {
      canScan: boolean;
      canVoid: boolean;
      canRefund: boolean;
    };
  }) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser) {
      throw new ForbiddenException('Organiser not found');
    }

    if (!organiser.metadata) {
      organiser.metadata = {};
    }
    if (!organiser.metadata.devices) {
      organiser.metadata.devices = [];
    }

    // Check if device already exists
    const existingDevice = (organiser.metadata.devices as any[]).find(
      (d: any) => d.deviceId === deviceData.deviceId
    );

    if (existingDevice) {
      // Update existing device
      Object.assign(existingDevice, {
        ...deviceData,
        status: existingDevice.status || 'active',
        connectionStatus: existingDevice.connectionStatus || 'offline',
        batteryLevel: existingDevice.batteryLevel || 100,
        firmwareVersion: existingDevice.firmwareVersion || 'v2.1.0',
        lastSync: existingDevice.lastSync || new Date().toISOString(),
        assignedStaff: existingDevice.assignedStaff || [],
      });
    } else {
      // Add new device
      (organiser.metadata.devices as any[]).push({
        ...deviceData,
        status: 'active',
        connectionStatus: 'offline',
        batteryLevel: 100,
        firmwareVersion: 'v2.1.0',
        lastSync: new Date().toISOString(),
        assignedStaff: [],
      });
    }

    await this.organiserRepository.save(organiser);
    return { success: true };
  }

  async updateDevice(organiserId: string, userId: string, deviceId: string, updateData: {
    deviceName?: string;
    deviceType?: string;
    gateId?: string;
    status?: string;
    permissions?: {
      canScan: boolean;
      canVoid: boolean;
      canRefund: boolean;
    };
  }) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.devices) {
      throw new ForbiddenException('Device not found');
    }

    const device = (organiser.metadata.devices as any[]).find(
      (d: any) => d.deviceId === deviceId
    );

    if (!device) {
      throw new ForbiddenException('Device not found');
    }

    Object.assign(device, updateData);
    await this.organiserRepository.save(organiser);
    return { success: true };
  }

  async deleteDevice(organiserId: string, userId: string, deviceId: string) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.devices) {
      throw new ForbiddenException('Device not found');
    }

    organiser.metadata.devices = (organiser.metadata.devices as any[]).filter(
      (d: any) => d.deviceId !== deviceId
    );

    await this.organiserRepository.save(organiser);
    return { success: true };
  }

  async createGate(organiserId: string, userId: string, gateData: {
    name: string;
    gateNumber: string;
    gateType: string;
    allowedTicketTypes?: string[];
    entryRestrictions: {
      earlyCheckIn: boolean;
      lateEntry: boolean;
      reEntry: boolean;
    };
  }) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser) {
      throw new ForbiddenException('Organiser not found');
    }

    if (!organiser.metadata) {
      organiser.metadata = {};
    }
    if (!organiser.metadata.gates) {
      organiser.metadata.gates = [];
    }

    const gateId = `gate-${Date.now()}`;
    const newGate = {
      id: gateId,
      ...gateData,
      assignedStaff: [],
      status: 'active',
    };

    (organiser.metadata.gates as any[]).push(newGate);
    await this.organiserRepository.save(organiser);
    return { success: true, gate: newGate };
  }

  async updateGate(organiserId: string, userId: string, gateId: string, updateData: {
    name?: string;
    gateNumber?: string;
    gateType?: string;
    allowedTicketTypes?: string[];
    entryRestrictions?: {
      earlyCheckIn: boolean;
      lateEntry: boolean;
      reEntry: boolean;
    };
    status?: string;
  }) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.gates) {
      throw new ForbiddenException('Gate not found');
    }

    const gate = (organiser.metadata.gates as any[]).find((g: any) => g.id === gateId);
    if (!gate) {
      throw new ForbiddenException('Gate not found');
    }

    Object.assign(gate, updateData);
    await this.organiserRepository.save(organiser);
    return { success: true };
  }

  async deleteGate(organiserId: string, userId: string, gateId: string) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.gates) {
      throw new ForbiddenException('Gate not found');
    }

    organiser.metadata.gates = (organiser.metadata.gates as any[]).filter(
      (g: any) => g.id !== gateId
    );

    await this.organiserRepository.save(organiser);
    return { success: true };
  }

  async getRegisteredDevices(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.devices) {
      return [];
    }

    return organiser.metadata.devices as any[];
  }

  async getRegisteredGates(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({ where: { id: organiserId } });
    if (!organiser || !organiser.metadata?.gates) {
      return [];
    }

    return organiser.metadata.gates as any[];
  }

  async getRevenueOverview(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get all paid orders for this organiser
    const orders = await this.orderRepository.find({
      where: { organiserId, status: OrderStatus.PAID },
      relations: ['payments', 'refunds'],
    });

    // Calculate revenue metrics
    let grossRevenue = 0;
    let totalRefunds = 0;
    const paymentBreakdown: Record<string, { amount: number; count: number }> = {};

    orders.forEach((order) => {
      const orderAmount = Number(order.totalAmountCents || 0);
      grossRevenue += orderAmount;

      // Payment breakdown
      if (order.payments) {
        order.payments.forEach((payment) => {
          if (payment.status === PaymentStatus.COMPLETED) {
            const method = payment.method || 'UNKNOWN';
            if (!paymentBreakdown[method]) {
              paymentBreakdown[method] = { amount: 0, count: 0 };
            }
            paymentBreakdown[method].amount += Number(payment.amountCents || 0);
            paymentBreakdown[method].count += 1;
          }
        });
      }

      // Refunds
      if (order.refunds) {
        order.refunds.forEach((refund) => {
          if (refund.status === RefundStatus.COMPLETED) {
            totalRefunds += Number(refund.amountCents || 0);
          }
        });
      }
    });

    // Calculate fees (assuming 5% platform fee + 16% VAT)
    const platformFeeRate = 0.05;
    const vatRate = 0.16;
    const platformFees = Math.round(grossRevenue * platformFeeRate);
    const vat = Math.round(grossRevenue * vatRate);
    const withholdingTax = Math.round(grossRevenue * 0.01); // 1% withholding tax
    const netRevenue = grossRevenue - platformFees - vat - withholdingTax - totalRefunds;

    // Calculate payment method percentages
    const totalPaymentAmount = Object.values(paymentBreakdown).reduce(
      (sum, data) => sum + data.amount,
      0
    );

    const paymentBreakdownFormatted: Record<string, { amount: number; percentage: number }> = {};
    Object.entries(paymentBreakdown).forEach(([method, data]) => {
      paymentBreakdownFormatted[method] = {
        amount: data.amount,
        percentage: totalPaymentAmount > 0 ? Math.round((data.amount / totalPaymentAmount) * 100) : 0,
      };
    });

    return {
      grossRevenue,
      netRevenue,
      platformFees,
      commission: platformFees, // Same as platform fees
      vat,
      withholding: withholdingTax,
      totalRefunds,
      paymentBreakdown: paymentBreakdownFormatted,
    };
  }

  async getTransactions(organiserId: string, userId: string, skip: number = 0, take: number = 50) {
    await this.verifyAccess(organiserId, userId);

    // Get all payments and refunds for this organiser's orders
    const orders = await this.orderRepository.find({
      where: { organiserId },
      relations: ['payments', 'refunds'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });

    const transactions: Array<{
      id: string;
      type: 'payment' | 'refund' | 'payout' | 'fee';
      amount: number;
      status: string;
      method: string;
      reference: string;
      date: string;
      orderId: string;
      orderNumber?: string;
    }> = [];

    orders.forEach((order) => {
      // Add payments as transactions
      if (order.payments) {
        order.payments.forEach((payment) => {
          transactions.push({
            id: payment.id,
            type: 'payment',
            amount: Number(payment.amountCents || 0),
            status: payment.status.toLowerCase(),
            method: payment.method || 'UNKNOWN',
            reference: payment.transactionId,
            date: payment.createdAt.toISOString(),
            orderId: order.id,
            orderNumber: order.orderNumber,
          });
        });
      }

      // Add refunds as transactions
      if (order.refunds) {
        order.refunds.forEach((refund) => {
          // Get payment method from order's payments if available
          const paymentMethod = order.payments && order.payments.length > 0 
            ? order.payments[0].method 
            : 'UNKNOWN';
          
          transactions.push({
            id: refund.id,
            type: 'refund',
            amount: -Number(refund.amountCents || 0), // Negative for refunds
            status: refund.status.toLowerCase(),
            method: paymentMethod || 'UNKNOWN',
            reference: refund.refundNumber || refund.id,
            date: refund.createdAt.toISOString(),
            orderId: order.id,
            orderNumber: order.orderNumber,
          });
        });
      }
    });

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      data: transactions,
      total: transactions.length,
      hasMore: false, // Simplified for now
    };
  }

  async getWalletPayouts(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get revenue overview to calculate balances
    const revenue = await this.getRevenueOverview(organiserId, userId);

    // For now, we'll use simplified logic:
    // Available balance = net revenue (ready for withdrawal)
    // Pending balance = orders that are paid but not yet settled (simplified to 0 for now)
    // In a real system, you'd track settlement periods and pending payouts

    const availableBalance = Math.max(0, revenue.netRevenue);
    const pendingBalance = 0; // Would be calculated based on settlement schedule
    const totalBalance = availableBalance + pendingBalance;

    // Get payout history from organiser metadata or a separate payout table
    // For now, return empty array - this would need a Payout entity
    const recentPayouts: Array<{
      id: string;
      amount: number;
      status: string;
      requestedAt: string;
      completedAt?: string;
      method: string;
    }> = [];

    // Check organiser metadata for payout history
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    if (organiser?.metadata?.payouts) {
      const payouts = organiser.metadata.payouts as Array<{
        id: string;
        amount: number;
        status: string;
        requestedAt: string;
        completedAt?: string;
        method: string;
      }>;
      recentPayouts.push(...payouts.slice(0, 10)); // Last 10 payouts
    }

    return {
      availableBalance,
      pendingBalance,
      totalBalance,
      recentPayouts: recentPayouts.sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ),
    };
  }

  async requestPayout(
    organiserId: string,
    userId: string,
    amount: number,
    method: string,
    accountDetails?: Record<string, any>
  ) {
    await this.verifyAccess(organiserId, userId);

    const wallet = await this.getWalletPayouts(organiserId, userId);

    if (amount > wallet.availableBalance) {
      throw new ForbiddenException('Insufficient balance for payout');
    }

    // Create payout record in organiser metadata
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found');
    }

    const payoutId = `payout-${Date.now()}`;
    const payout = {
      id: payoutId,
      amount,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      method,
      accountDetails,
    };

    const metadata = organiser.metadata || {};
    const payouts = (metadata.payouts as Array<any>) || [];
    payouts.push(payout);

    await this.organiserRepository.update(organiserId, {
      metadata: {
        ...metadata,
        payouts,
      },
    });

    return payout;
  }

  async getCampaigns(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get campaigns from organiser metadata
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    return (organiser?.metadata?.campaigns as any[]) || [];
  }

  async createCampaign(
    organiserId: string,
    userId: string,
    campaignData: {
      name: string;
      type: string;
      status: string;
      scheduledAt?: string;
      content?: string;
      targetAudience?: string[];
    }
  ) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found');
    }

    const campaignId = `campaign-${Date.now()}`;
    const campaign = {
      id: campaignId,
      ...campaignData,
      createdAt: new Date().toISOString(),
    };

    const metadata = organiser.metadata || {};
    const campaigns = (metadata.campaigns as any[]) || [];
    campaigns.push(campaign);

    await this.organiserRepository.update(organiserId, {
      metadata: {
        ...metadata,
        campaigns,
      },
    });

    return campaign;
  }

  async getAffiliates(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get affiliates from organiser metadata
    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    return (organiser?.metadata?.affiliates as any[]) || [];
  }

  async createAffiliate(
    organiserId: string,
    userId: string,
    affiliateData: {
      name: string;
      email?: string;
      commissionRate: number;
      code: string;
    }
  ) {
    await this.verifyAccess(organiserId, userId);

    const organiser = await this.organiserRepository.findOne({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new ForbiddenException('Organiser not found');
    }

    const affiliateId = `affiliate-${Date.now()}`;
    const affiliate = {
      id: affiliateId,
      ...affiliateData,
      totalEarnings: 0,
      totalReferrals: 0,
      createdAt: new Date().toISOString(),
    };

    const metadata = organiser.metadata || {};
    const affiliates = (metadata.affiliates as any[]) || [];
    affiliates.push(affiliate);

    await this.organiserRepository.update(organiserId, {
      metadata: {
        ...metadata,
        affiliates,
      },
    });

    return affiliate;
  }

  // Analytics Methods
  async getSalesAnalytics(organiserId: string, userId: string, days: number = 180) {
    await this.verifyAccess(organiserId, userId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders with relations
    const orders = await this.orderRepository.find({
      where: {
        organiserId,
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: ['items', 'items.ticketType', 'payments'],
    });

    // Calculate sales trend by day
    const salesByDate = new Map<string, { revenue: number; count: number }>();
    orders.forEach((order) => {
      if (order.status === OrderStatus.PAID && order.payments?.some(p => p.status === PaymentStatus.COMPLETED)) {
        const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
        const existing = salesByDate.get(dateKey) || { revenue: 0, count: 0 };
        salesByDate.set(dateKey, {
          revenue: existing.revenue + Number(order.totalAmountCents || 0),
          count: existing.count + (order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0),
        });
      }
    });

    const salesTrend = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate revenue by ticket type
    const revenueByTicketType = new Map<string, { revenue: number; count: number }>();
    orders.forEach((order) => {
      if (order.status === OrderStatus.PAID) {
        order.items?.forEach((item) => {
          const typeName = item.ticketType?.name || 'Unknown';
          const existing = revenueByTicketType.get(typeName) || { revenue: 0, count: 0 };
          revenueByTicketType.set(typeName, {
            revenue: existing.revenue + Number(item.totalPriceCents || 0),
            count: existing.count + item.quantity,
          });
        });
      }
    });

    // Calculate revenue by payment method
    const revenueByPaymentMethod = new Map<string, { revenue: number; count: number }>();
    orders.forEach((order) => {
      if (order.status === OrderStatus.PAID && order.payments?.length) {
        order.payments.forEach((payment) => {
          if (payment.status === PaymentStatus.COMPLETED) {
            const method = payment.method || 'unknown';
            const existing = revenueByPaymentMethod.get(method) || { revenue: 0, count: 0 };
            revenueByPaymentMethod.set(method, {
              revenue: existing.revenue + Number(payment.amountCents || 0),
              count: existing.count + 1,
            });
          }
        });
      }
    });

    return {
      salesTrend,
      revenueByTicketType: Array.from(revenueByTicketType.entries()).map(([type, data]) => ({
        type,
        revenue: data.revenue,
        count: data.count,
      })),
      revenueByPaymentMethod: Array.from(revenueByPaymentMethod.entries()).map(([method, data]) => ({
        method,
        revenue: data.revenue,
        count: data.count,
        percentage: 0, // Will be calculated on frontend
      })),
    };
  }

  async getCustomerInsights(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get all orders with buyer info
    const orders = await this.orderRepository.find({
      where: { organiserId },
      relations: ['buyer', 'items'],
    });

    // Group by buyer
    const customerMap = new Map<string, {
      customer: User;
      orders: Order[];
      totalSpent: number;
      orderCount: number;
    }>();

    orders.forEach((order) => {
      if (order.buyer) {
        const existing = customerMap.get(order.buyer.id) || {
          customer: order.buyer,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
        };
        existing.orders.push(order);
        existing.totalSpent += Number(order.totalAmountCents || 0);
        existing.orderCount += 1;
        customerMap.set(order.buyer.id, existing);
      }
    });

    const customers = Array.from(customerMap.values());

    // Calculate segments
    const newCustomers = customers.filter(c => c.orderCount === 1);
    const returningCustomers = customers.filter(c => c.orderCount > 1);

    // Top spenders
    const topSpenders = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c, index) => ({
        customer: `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim() || c.customer.email,
        orders: c.orderCount,
        total: c.totalSpent,
        avgOrder: c.orderCount > 0 ? Math.round(c.totalSpent / c.orderCount) : 0,
      }));

    return {
      totalCustomers: customers.length,
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers.length,
      avgOrderValue: customers.length > 0
        ? Math.round(customers.reduce((sum, c) => sum + (c.totalSpent / c.orderCount), 0) / customers.length)
        : 0,
      retentionRate: customers.length > 0
        ? (returningCustomers.length / customers.length) * 100
        : 0,
      topSpenders,
    };
  }

  async getEventPerformance(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    // Get events
    const events = await this.eventRepository.find({
      where: { organiserId },
    });

    const orders = await this.orderRepository.find({
      where: { organiserId },
      relations: ['items', 'items.ticketType', 'items.ticketType.event'],
    });

    // Get tickets for check-in calculation
    const eventIds = events.map(e => e.id);
    const tickets = eventIds.length > 0
      ? await this.ticketRepository
          .createQueryBuilder('ticket')
          .leftJoinAndSelect('ticket.checkins', 'checkin')
          .where('ticket.eventId IN (:...eventIds)', { eventIds })
          .getMany()
      : [];

    const eventPerformance = events.map((event) => {
      const eventOrders = orders.filter((o) =>
        o.items?.some((item) => item.ticketType?.eventId === event.id)
      );
      const completedOrders = eventOrders.filter(
        (o) => o.status === OrderStatus.PAID
      );
      const totalTickets = completedOrders.reduce(
        (sum, o) => sum + (o.items?.reduce((s, item) => s + item.quantity, 0) || 0),
        0
      );
      const totalRevenue = completedOrders.reduce(
        (sum, o) => sum + Number(o.totalAmountCents || 0),
        0
      );

      // Get check-ins for this event
      const eventTickets = tickets.filter(t => t.eventId === event.id);
      const checkedIn = eventTickets.filter((t) => t.checkins && t.checkins.length > 0).length;
      const checkInRate = totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;

      return {
        eventId: event.id,
        eventName: event.title,
        views: 0, // Would need event view tracking
        purchases: totalTickets,
        conversion: 0, // Would need view data
        revenue: totalRevenue,
        checkInRate: Math.round(checkInRate),
      };
    });

    return {
      events: eventPerformance,
      totalViews: 0,
      totalPurchases: eventPerformance.reduce((sum, e) => sum + e.purchases, 0),
      avgConversion: 0,
      totalRevenue: eventPerformance.reduce((sum, e) => sum + e.revenue, 0),
      avgCheckInRate: eventPerformance.length > 0
        ? Math.round(eventPerformance.reduce((sum, e) => sum + e.checkInRate, 0) / eventPerformance.length)
        : 0,
    };
  }

  async getFinanceReports(organiserId: string, userId: string, months: number = 6) {
    await this.verifyAccess(organiserId, userId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const orders = await this.orderRepository.find({
      where: {
        organiserId,
        createdAt: MoreThanOrEqual(startDate),
      },
      relations: ['payments'],
    });

    // Calculate revenue breakdown by month
    const revenueByMonth = new Map<string, { gross: number; net: number; fees: number }>();
    
    orders.forEach((order) => {
      if (order.status === OrderStatus.PAID) {
        const monthKey = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
        const existing = revenueByMonth.get(monthKey) || { gross: 0, net: 0, fees: 0 };
        const gross = Number(order.totalAmountCents || 0);
        // Estimate fees (typically 3-5% platform fee)
        const fees = Math.round(gross * 0.04);
        const net = gross - fees;
        revenueByMonth.set(monthKey, {
          gross: existing.gross + gross,
          net: existing.net + net,
          fees: existing.fees + fees,
        });
      }
    });

    const revenueBreakdown = Array.from(revenueByMonth.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        gross: data.gross,
        net: data.net,
        fees: data.fees,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalGross = revenueBreakdown.reduce((sum, r) => sum + r.gross, 0);
    const totalNet = revenueBreakdown.reduce((sum, r) => sum + r.net, 0);
    const totalFees = revenueBreakdown.reduce((sum, r) => sum + r.fees, 0);

    // Calculate tax breakdown (estimate VAT at 16%)
    const vatAmount = Math.round(totalGross * 0.16);
    const withholdingTax = Math.round(totalGross * 0.05);
    const otherTaxes = Math.round(totalGross * 0.01);
    const totalTax = vatAmount + withholdingTax + otherTaxes;

    return {
      revenueBreakdown,
      taxBreakdown: [
        { type: 'VAT (16%)', amount: vatAmount, percentage: totalTax > 0 ? Math.round((vatAmount / totalTax) * 100) : 0 },
        { type: 'Withholding Tax', amount: withholdingTax, percentage: totalTax > 0 ? Math.round((withholdingTax / totalTax) * 100) : 0 },
        { type: 'Other Taxes', amount: otherTaxes, percentage: totalTax > 0 ? Math.round((otherTaxes / totalTax) * 100) : 0 },
      ],
      feeBreakdown: [
        { category: 'Platform Fee', amount: Math.round(totalFees * 0.6), percentage: 60 },
        { category: 'Payment Processing', amount: Math.round(totalFees * 0.24), percentage: 24 },
        { category: 'Commission', amount: Math.round(totalFees * 0.16), percentage: 16 },
      ],
      totalGross,
      totalNet,
      totalFees,
      totalTax,
      netMargin: totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0,
    };
  }

  async getFeaturedPricing(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);
    
    // Get pricing from admin settings
    // For now, return default pricing
    // In production, this would fetch from admin settings
    try {
      const response = await fetch(`${process.env.API_URL || 'http://localhost:5000'}/api/v1/admin/featured/pricing`, {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Fallback to default
    }
    
    // Fallback to default
    return {
      costPerDayCents: 50000, // KES 500 per day
      currency: 'KES',
    };
  }

  async requestFeaturedEvent(
    organiserId: string,
    userId: string,
    eventId: string,
    days: number,
    startDate: Date,
    endDate: Date,
    notes?: string
  ) {
    await this.verifyAccess(organiserId, userId);

    // Verify event belongs to organiser
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organiserId },
    });

    if (!event) {
      throw new ForbiddenException('Event not found or access denied');
    }

    // Check if event is ended
    if (event.endsAt && new Date(event.endsAt) < new Date()) {
      throw new ForbiddenException('Cannot feature ended events');
    }

    // Get pricing
    const pricing = await this.getFeaturedPricing(organiserId, userId);
    const costPerDayCents = pricing.costPerDayCents || 50000;
    const costCents = days * costPerDayCents;

    // Check for existing pending request
    const existingRequest = await this.featuredRequestRepository.findOne({
      where: {
        eventId,
        status: FeaturedRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ForbiddenException('A pending request already exists for this event');
    }

    // Create request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request = this.featuredRequestRepository.create({
      id: requestId,
      eventId,
      organiserId,
      requestedBy: userId,
      status: FeaturedRequestStatus.PENDING,
      days,
      costCents,
      costPerDayCents,
      startDate,
      endDate,
      notes,
    });

    await this.featuredRequestRepository.save(request);

    // Notify all admins about the new featured request
    await this.notifyAdminsOfFeaturedRequest(request);

    return this.featuredRequestRepository.findOne({
      where: { id: requestId },
      relations: ['event', 'organiser', 'requester'],
    });
  }

  private async notifyAdminsOfFeaturedRequest(request: FeaturedRequest): Promise<void> {
    try {
      // Get event and organiser details
      const event = await this.eventRepository.findOne({
        where: { id: request.eventId },
        relations: ['organiser'],
      });

      if (!event) {
        this.logger.warn(`Event not found for featured request: ${request.eventId}`);
        return;
      }

      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { activeRole: UserRole.ADMIN },
        select: ['id'],
      });

      if (adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about featured request');
        return;
      }

      // Send real-time notification to admin room
      await this.realtimeNotificationService.notifyAdmins({
        id: `featured-request-${request.id}-${Date.now()}`,
        type: NotificationPayloadType.SYSTEM_ALERT,
        title: 'New Featured Event Request',
        message: `${event.organiser?.name || 'An organiser'} has requested featured status for "${event.title}"`,
        metadata: {
          requestId: request.id,
          eventId: event.id,
          eventTitle: event.title,
          organiserId: request.organiserId,
          organiserName: event.organiser?.name,
          days: request.days,
          costCents: request.costCents,
          startDate: request.startDate,
          endDate: request.endDate,
          link: `/admin/featured/requests`,
        },
        timestamp: new Date(),
      });

      // Create persistent notifications for each admin
      const notificationPromises = adminUsers.map((admin) =>
        this.notificationsService.createNotification({
          userId: admin.id,
          title: 'New Featured Event Request',
          message: `${event.organiser?.name || 'An organiser'} has requested featured status for "${event.title}" (${request.days} days - KES ${(request.costCents / 100).toLocaleString()})`,
          type: NotificationType.SYSTEM_ALERT,
          metadata: {
            requestId: request.id,
            eventId: event.id,
            eventTitle: event.title,
            organiserId: request.organiserId,
            organiserName: event.organiser?.name,
            days: request.days,
            costCents: request.costCents,
            startDate: request.startDate,
            endDate: request.endDate,
            link: `/admin/featured/requests`,
          },
        }),
      );

      await Promise.allSettled(notificationPromises);
      this.logger.log(`Notified ${adminUsers.length} admin(s) about featured request: ${request.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to notify admins of featured request: ${error.message}`);
    }
  }

  async getFeaturedRequests(organiserId: string, userId: string) {
    await this.verifyAccess(organiserId, userId);

    const requests = await this.featuredRequestRepository.find({
      where: { organiserId },
      relations: ['event', 'requester', 'reviewer'],
      order: { createdAt: 'DESC' },
    });

    return requests;
  }
}

