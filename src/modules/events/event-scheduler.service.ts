import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Event, EventStatus } from '../../database/entities/event.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';

@Injectable()
export class EventSchedulerService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Update live pulse events every minute
   * Events are automatically set to livePulse if they're happening now
   * Manually set livePulse events are preserved
   * Ended events are excluded
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateLivePulseEvents() {
    const now = new Date();
    
    // Find events that are currently happening (between startsAt and endsAt)
    // Exclude ended/completed events
    const activeEvents = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
      },
    });

    // Get all events that should be live pulse (active + manually set)
    const allLivePulseEventIds = new Set<string>();
    
    // Add currently active events
    activeEvents.forEach(event => allLivePulseEventIds.add(event.id));

    // Find manually set live pulse events that are still published and not ended
    const manuallySetLivePulse = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
        livePulse: true,
        endsAt: MoreThanOrEqual(now), // Not ended yet
      },
    });
    manuallySetLivePulse.forEach(event => allLivePulseEventIds.add(event.id));

    // Update all events: set livePulse to true for events in the set, false for others
    const allPublishedEvents = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
      },
    });

    const updates = allPublishedEvents.map(event => ({
      id: event.id,
      livePulse: allLivePulseEventIds.has(event.id),
    }));

    // Batch update
    for (const update of updates) {
      await this.eventRepository.update(update.id, { livePulse: update.livePulse });
    }

    console.log(`[EventScheduler] Updated ${updates.length} events for live pulse. ${allLivePulseEventIds.size} are currently live.`);
  }

  /**
   * Update "hot right now" events every 5 minutes
   * Events with high recent sales activity are marked as hot
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async updateHotRightNowEvents() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // Last hour
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Get all published events that are not ended
    const publishedEvents = await this.eventRepository.find({
      where: {
        status: EventStatus.PUBLISHED,
        endsAt: MoreThanOrEqual(now), // Not ended yet
      },
    });

    // Calculate sales activity for each event
    const eventActivity = await Promise.all(
      publishedEvents.map(async (event) => {
        // Count orders in the last hour (join through orderItems -> ticketType -> event)
        const recentOrders = await this.orderRepository
          .createQueryBuilder('order')
          .innerJoin('order.items', 'orderItem')
          .innerJoin('orderItem.ticketType', 'ticketType')
          .where('order.status = :status', { status: OrderStatus.PAID })
          .andWhere('order.createdAt BETWEEN :oneHourAgo AND :now', { oneHourAgo, now })
          .andWhere('ticketType.eventId = :eventId', { eventId: event.id })
          .getCount();

        // Count total orders in the last 24 hours for context
        const dailyOrders = await this.orderRepository
          .createQueryBuilder('order')
          .innerJoin('order.items', 'orderItem')
          .innerJoin('orderItem.ticketType', 'ticketType')
          .where('order.status = :status', { status: OrderStatus.PAID })
          .andWhere('order.createdAt BETWEEN :oneDayAgo AND :now', { oneDayAgo, now })
          .andWhere('ticketType.eventId = :eventId', { eventId: event.id })
          .getCount();

        // Calculate activity score (recent orders + daily orders weight)
        const activityScore = recentOrders * 2 + dailyOrders;

        return {
          eventId: event.id,
          activityScore,
          recentOrders,
        };
      }),
    );

    // Sort by activity score and take top 10
    const topEvents = eventActivity
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10)
      .map(e => e.eventId);

    // Update all events: set hotRightNow to true for top events, false for others
    const updates = publishedEvents.map(event => ({
      id: event.id,
      hotRightNow: topEvents.includes(event.id),
    }));

    // Batch update
    for (const update of updates) {
      await this.eventRepository.update(update.id, { hotRightNow: update.hotRightNow });
    }

    console.log(`[EventScheduler] Updated ${updates.length} events for hot right now. Top ${topEvents.length} events are hot.`);
  }
}

