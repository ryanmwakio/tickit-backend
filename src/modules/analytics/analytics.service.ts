import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from '../../database/entities/event.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Ticket, TicketStatus } from '../../database/entities/ticket.entity';
import { Checkin } from '../../database/entities/checkin.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Organiser } from '../../database/entities/organiser.entity';

@Injectable()
export class AnalyticsService {
  constructor(
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
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
  ) {}

  async getEventAnalytics(eventId: string, organiserId?: string) {
    if (organiserId) {
      const event = await this.eventRepository.findOne({
        where: { id: eventId, organiserId },
      });
      if (!event) {
        throw new ForbiddenException('Event not found or access denied');
      }
    }

    const [ticketsSold, ticketsCheckedIn, revenue, paymentMethods] = await Promise.all([
      this.ticketRepository.count({
        where: { ticketType: { eventId }, status: TicketStatus.ACTIVE },
      }),
      this.checkinRepository.count({
        where: { ticket: { ticketType: { eventId } } },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .leftJoin('order.items', 'item')
        .leftJoin('item.ticketType', 'ticketType')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.status = :status', { status: OrderStatus.PAID })
        .andWhere('ticketType.eventId = :eventId', { eventId })
        .getRawOne(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoin('payment.order', 'order')
        .leftJoin('order.items', 'item')
        .leftJoin('item.ticketType', 'ticketType')
        .select('payment.method', 'method')
        .addSelect('SUM(payment.amountCents)', 'total')
        .where('payment.status = :status', { status: 'COMPLETED' })
        .andWhere('ticketType.eventId = :eventId', { eventId })
        .groupBy('payment.method')
        .getRawMany(),
    ]);

    return {
      ticketsSold,
      ticketsCheckedIn,
      checkInRate: ticketsSold > 0 ? (ticketsCheckedIn / ticketsSold) * 100 : 0,
      revenue: parseInt(revenue?.total || '0'),
      paymentMethods: paymentMethods.map((pm) => ({
        method: pm.method,
        total: parseInt(pm.total || '0'),
      })),
    };
  }

  async getOrganiserAnalytics(organiserId: string) {
    const [events, totalRevenue, totalTicketsSold, upcomingEvents] = await Promise.all([
      this.eventRepository.count({ where: { organiserId } }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmountCents)', 'total')
        .where('order.organiserId = :organiserId', { organiserId })
        .andWhere('order.status = :status', { status: OrderStatus.PAID })
        .getRawOne(),
      this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoin('ticket.ticketType', 'ticketType')
        .leftJoin('ticketType.event', 'event')
        .where('event.organiserId = :organiserId', { organiserId })
        .andWhere('ticket.status = :status', { status: TicketStatus.ACTIVE })
        .getCount(),
      this.eventRepository.count({
        where: { organiserId, status: EventStatus.PUBLISHED },
      }),
    ]);

    return {
      totalEvents: events,
      upcomingEvents,
      totalRevenue: parseInt(totalRevenue?.total || '0'),
      totalTicketsSold,
    };
  }

  async getSalesTrend(organiserId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('SUM(order.totalAmountCents)', 'revenue')
      .where('order.organiserId = :organiserId', { organiserId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return sales.map((s) => ({
      date: s.date,
      count: parseInt(s.count || '0'),
      revenue: parseInt(s.revenue || '0'),
    }));
  }
}

