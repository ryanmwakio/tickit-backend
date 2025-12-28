import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event, EventStatus } from "../../database/entities/event.entity";
import { Order, OrderStatus } from "../../database/entities/order.entity";
import { Ticket, TicketStatus } from "../../database/entities/ticket.entity";
import { Checkin } from "../../database/entities/checkin.entity";
import { Payment } from "../../database/entities/payment.entity";
import { Organiser } from "../../database/entities/organiser.entity";
import { User } from "../../database/entities/user.entity";

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getEventAnalytics(eventId: string, organiserId?: string) {
    if (organiserId) {
      const event = await this.eventRepository.findOne({
        where: { id: eventId, organiserId },
      });
      if (!event) {
        throw new ForbiddenException("Event not found or access denied");
      }
    }

    const [ticketsSold, ticketsCheckedIn, revenue, paymentMethods] =
      await Promise.all([
        this.ticketRepository.count({
          where: { ticketType: { eventId }, status: TicketStatus.ACTIVE },
        }),
        this.checkinRepository.count({
          where: { ticket: { ticketType: { eventId } } },
        }),
        this.orderRepository
          .createQueryBuilder("order")
          .leftJoin("order.items", "item")
          .leftJoin("item.ticketType", "ticketType")
          .select("SUM(order.totalAmountCents)", "total")
          .where("order.status = :status", { status: OrderStatus.PAID })
          .andWhere("ticketType.eventId = :eventId", { eventId })
          .getRawOne(),
        this.paymentRepository
          .createQueryBuilder("payment")
          .leftJoin("payment.order", "order")
          .leftJoin("order.items", "item")
          .leftJoin("item.ticketType", "ticketType")
          .select("payment.method", "method")
          .addSelect("SUM(payment.amountCents)", "total")
          .where("payment.status = :status", { status: "COMPLETED" })
          .andWhere("ticketType.eventId = :eventId", { eventId })
          .groupBy("payment.method")
          .getRawMany(),
      ]);

    return {
      ticketsSold,
      ticketsCheckedIn,
      checkInRate: ticketsSold > 0 ? (ticketsCheckedIn / ticketsSold) * 100 : 0,
      revenue: parseInt(revenue?.total || "0"),
      paymentMethods: paymentMethods.map((pm) => ({
        method: pm.method,
        total: parseInt(pm.total || "0"),
      })),
    };
  }

  async getOrganiserAnalytics(organiserId: string) {
    const [events, totalRevenue, totalTicketsSold, upcomingEvents] =
      await Promise.all([
        this.eventRepository.count({ where: { organiserId } }),
        this.orderRepository
          .createQueryBuilder("order")
          .select("SUM(order.totalAmountCents)", "total")
          .where("order.organiserId = :organiserId", { organiserId })
          .andWhere("order.status = :status", { status: OrderStatus.PAID })
          .getRawOne(),
        this.ticketRepository
          .createQueryBuilder("ticket")
          .leftJoin("ticket.ticketType", "ticketType")
          .leftJoin("ticketType.event", "event")
          .where("event.organiserId = :organiserId", { organiserId })
          .andWhere("ticket.status = :status", { status: TicketStatus.ACTIVE })
          .getCount(),
        this.eventRepository.count({
          where: { organiserId, status: EventStatus.PUBLISHED },
        }),
      ]);

    return {
      totalEvents: events,
      upcomingEvents,
      totalRevenue: parseInt(totalRevenue?.total || "0"),
      totalTicketsSold,
    };
  }

  async getSalesTrend(organiserId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.orderRepository
      .createQueryBuilder("order")
      .select("DATE(order.createdAt)", "date")
      .addSelect("COUNT(order.id)", "count")
      .addSelect("SUM(order.totalAmountCents)", "revenue")
      .where("order.organiserId = :organiserId", { organiserId })
      .andWhere("order.status = :status", { status: OrderStatus.PAID })
      .andWhere("order.createdAt >= :startDate", { startDate })
      .groupBy("DATE(order.createdAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    return sales.map((s) => ({
      date: s.date,
      count: parseInt(s.count || "0"),
      revenue: parseInt(s.revenue || "0"),
    }));
  }

  async getPlatformAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      upcomingEvents,
      totalTicketsSold,
      totalRevenue,
      totalUsers,
      totalOrganisers,
      recentOrders,
      weeklyRevenue,
      paymentMethods,
      topCategories,
      checkInRate,
      salesVelocity,
    ] = await Promise.all([
      // Total events
      this.eventRepository.count({
        where: { status: EventStatus.PUBLISHED },
      }),

      // Upcoming events
      this.eventRepository
        .createQueryBuilder("event")
        .where("event.status = :status", { status: EventStatus.PUBLISHED })
        .andWhere("event.startsAt >= :now", { now })
        .getCount(),

      // Total tickets sold
      this.ticketRepository.count({
        where: { status: TicketStatus.ACTIVE },
      }),

      // Total revenue
      this.orderRepository
        .createQueryBuilder("order")
        .select("SUM(order.totalAmountCents)", "total")
        .where("order.status = :status", { status: OrderStatus.PAID })
        .getRawOne(),

      // Total users
      this.userRepository.count(),

      // Total organisers
      this.organiserRepository.count(),

      // Recent orders (last 30 days)
      this.orderRepository
        .createQueryBuilder("order")
        .where("order.status = :status", { status: OrderStatus.PAID })
        .andWhere("order.createdAt >= :thirtyDaysAgo", { thirtyDaysAgo })
        .getCount(),

      // Weekly revenue
      this.orderRepository
        .createQueryBuilder("order")
        .select("SUM(order.totalAmountCents)", "total")
        .where("order.status = :status", { status: OrderStatus.PAID })
        .andWhere("order.createdAt >= :weekAgo", { weekAgo: sevenDaysAgo })
        .getRawOne(),

      // Payment methods distribution
      this.paymentRepository
        .createQueryBuilder("payment")
        .select("payment.method", "method")
        .addSelect("COUNT(payment.id)", "count")
        .addSelect("SUM(payment.amountCents)", "total")
        .where("payment.status = :status", { status: "COMPLETED" })
        .andWhere("payment.createdAt >= :thirtyDaysAgo", { thirtyDaysAgo })
        .groupBy("payment.method")
        .getRawMany(),

      // Top event categories
      this.eventRepository
        .createQueryBuilder("event")
        .select("event.category", "category")
        .addSelect("COUNT(event.id)", "count")
        .where("event.status = :status", { status: EventStatus.PUBLISHED })
        .andWhere("event.createdAt >= :thirtyDaysAgo", { thirtyDaysAgo })
        .groupBy("event.category")
        .orderBy("count", "DESC")
        .limit(5)
        .getRawMany(),

      // Check-in rate
      this.checkinRepository
        .createQueryBuilder("checkin")
        .leftJoin("checkin.ticket", "ticket")
        .leftJoin("ticket.ticketType", "ticketType")
        .leftJoin("ticketType.event", "event")
        .select("COUNT(DISTINCT checkin.id)", "checkedIn")
        .addSelect("COUNT(DISTINCT ticket.id)", "totalTickets")
        .where("event.startsAt >= :thirtyDaysAgo", { thirtyDaysAgo })
        .andWhere("event.startsAt <= :now", { now })
        .getRawOne(),

      // Sales velocity (orders per day last 7 days)
      this.orderRepository
        .createQueryBuilder("order")
        .select("DATE(order.createdAt)", "date")
        .addSelect("COUNT(order.id)", "count")
        .addSelect("SUM(order.totalAmountCents)", "revenue")
        .where("order.status = :status", { status: OrderStatus.PAID })
        .andWhere("order.createdAt >= :weekAgo", { weekAgo: sevenDaysAgo })
        .groupBy("DATE(order.createdAt)")
        .orderBy("date", "DESC")
        .getRawMany(),
    ]);

    const totalRevenueAmount = parseInt(totalRevenue?.total || "0");
    const weeklyRevenueAmount = parseInt(weeklyRevenue?.total || "0");
    const checkedInCount = parseInt(checkInRate?.checkedIn || "0");
    const totalTicketsForRate = parseInt(checkInRate?.totalTickets || "0");
    const averageCheckInRate =
      totalTicketsForRate > 0
        ? (checkedInCount / totalTicketsForRate) * 100
        : 0;

    // Calculate percentage changes (mock data for demonstration)
    const salesVelocityTrend =
      salesVelocity.length > 1
        ? ((parseInt(salesVelocity[0]?.count || "0") -
            parseInt(salesVelocity[1]?.count || "0")) /
            Math.max(parseInt(salesVelocity[1]?.count || "1"), 1)) *
          100
        : 0;

    return {
      // Main metrics
      totalEvents,
      upcomingEvents,
      totalTicketsSold,
      totalRevenue: totalRevenueAmount,
      totalUsers,
      totalOrganisers,
      recentOrders,

      // Performance indicators
      weeklyRevenue: weeklyRevenueAmount,
      checkInRate: Math.round(averageCheckInRate * 10) / 10,
      salesVelocityChange: Math.round(salesVelocityTrend * 10) / 10,

      // Distributions
      paymentMethods: paymentMethods.map((pm) => ({
        method: pm.method,
        count: parseInt(pm.count || "0"),
        total: parseInt(pm.total || "0"),
      })),

      topCategories: topCategories.map((cat) => ({
        category: cat.category,
        count: parseInt(cat.count || "0"),
      })),

      // Trends
      salesVelocity: salesVelocity.map((sv) => ({
        date: sv.date,
        count: parseInt(sv.count || "0"),
        revenue: parseInt(sv.revenue || "0"),
      })),

      // Insights
      insights: [
        {
          label: "Sales velocity",
          metric: `KES ${(weeklyRevenueAmount / 100).toLocaleString()}`,
          change: `${salesVelocityTrend >= 0 ? "+" : ""}${salesVelocityTrend.toFixed(1)}% WoW`,
          detail: `${recentOrders} orders in last 30 days. Peak performance on mobile checkouts.`,
        },
        {
          label: "Platform engagement",
          metric: `${totalUsers.toLocaleString()} users`,
          change: `${totalOrganisers} organisers`,
          detail: `${upcomingEvents} upcoming events across ${topCategories.length} active categories.`,
        },
        {
          label: "Check-in success",
          metric: `${averageCheckInRate.toFixed(1)}%`,
          change: `${checkedInCount} scanned`,
          detail: `Offline-capable scanners with duplicate detection and fraud prevention.`,
        },
        {
          label: "Payment reliability",
          metric:
            paymentMethods.length > 0
              ? `${paymentMethods[0]?.method || "MPesa"} leading`
              : "Multi-channel",
          change: `${paymentMethods.length} methods`,
          detail: `MPesa Express, cards, and wallets with automated reconciliation.`,
        },
      ],
    };
  }

  async getPlatformStats() {
    const analytics = await this.getPlatformAnalytics();

    return {
      totalEvents: analytics.totalEvents,
      totalTicketsSold: analytics.totalTicketsSold,
      totalRevenue: analytics.totalRevenue,
      totalUsers: analytics.totalUsers,
      upcomingEvents: analytics.upcomingEvents,
      checkInRate: analytics.checkInRate,
      weeklyRevenue: analytics.weeklyRevenue,
      salesVelocityChange: analytics.salesVelocityChange,
    };
  }
}
