import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, MoreThan } from "typeorm";
import { Organiser } from "../../database/entities/organiser.entity";
import { User } from "../../database/entities/user.entity";
import { Event, EventStatus } from "../../database/entities/event.entity";
import { CreateOrganiserDto } from "./dto/create-organiser.dto";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class OrganisersService {
  constructor(
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(
    ownerId: string,
    createDto: CreateOrganiserDto,
  ): Promise<Organiser> {
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
      relations: ["owner"],
      order: { createdAt: "DESC" },
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
      relations: ["owner", "events"],
    });

    if (!organiser) {
      throw new NotFoundException("Organiser not found");
    }

    // Check access
    if (userId && organiser.ownerId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return organiser;
  }

  async update(
    id: string,
    updateDto: Partial<CreateOrganiserDto>,
    userId: string,
  ): Promise<Organiser> {
    const organiser = await this.findOne(id, userId);
    await this.organiserRepository.update(id, updateDto);
    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const organiser = await this.findOne(id, userId);
    await this.organiserRepository.remove(organiser);
  }

  // Admin-specific methods
  async findAllForAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "active" | "suspended" | "inactive";
    sortBy?: "name" | "createdAt" | "eventsCount";
    sortOrder?: "asc" | "desc";
  }): Promise<{
    data: Organiser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;

      // Build query with search conditions
      const queryBuilder = this.organiserRepository
        .createQueryBuilder("organiser")
        .leftJoinAndSelect("organiser.owner", "owner");

      if (search && search.trim()) {
        const searchTerm = search.trim();
        queryBuilder.where(
          "(organiser.name ILIKE :search OR organiser.description ILIKE :search OR owner.email ILIKE :search OR CONCAT(owner.firstName, ' ', owner.lastName) ILIKE :search)",
          { search: `%${searchTerm}%` },
        );
      }

      if (status) {
        const statusCondition = "organiser.metadata ->> 'status' = :status";
        if (search && search.trim()) {
          queryBuilder.andWhere(statusCondition, { status });
        } else {
          queryBuilder.where(statusCondition, { status });
        }
      }

      // Apply sorting
      if (sortBy === "eventsCount") {
        // For events count sorting, we'll sort by createdAt for now
        // TODO: Add proper events count sorting with subquery
        queryBuilder.orderBy(
          "organiser.createdAt",
          sortOrder.toUpperCase() as "ASC" | "DESC",
        );
      } else {
        queryBuilder.orderBy(
          `organiser.${sortBy}`,
          sortOrder.toUpperCase() as "ASC" | "DESC",
        );
      }

      // Apply pagination
      queryBuilder.skip((page - 1) * limit).take(limit);

      const [organisers, total] = await queryBuilder.getManyAndCount();

      // Add events count separately for each organiser
      const organisersWithStats = await Promise.all(
        organisers.map(async (organiser) => {
          const eventsCount = await this.eventRepository.count({
            where: { organiserId: organiser.id },
          });
          return {
            ...organiser,
            eventsCount,
          };
        }),
      );

      return {
        data: organisersWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Error in findAllForAdmin:", error);
      return {
        data: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      };
    }
  }

  async findOneForAdmin(id: string): Promise<
    Organiser & {
      eventsCount: number;
      activeEventsCount: number;
      totalRevenue: number;
      lastEventDate?: Date;
    }
  > {
    try {
      const organiser = await this.organiserRepository.findOne({
        where: { id },
        relations: ["owner"],
      });

      if (!organiser) {
        throw new NotFoundException("Organiser not found");
      }

      // Get events count separately
      const eventsCount = await this.eventRepository.count({
        where: { organiserId: id },
      });

      const activeEventsCount = await this.eventRepository.count({
        where: {
          organiserId: id,
          status: EventStatus.PUBLISHED,
        },
      });

      // Get last event date
      const lastEvent = await this.eventRepository.findOne({
        where: { organiserId: id },
        order: { startsAt: "DESC" },
      });

      return {
        ...organiser,
        eventsCount,
        activeEventsCount,
        totalRevenue: 0, // Simplified for now - can be enhanced later
        lastEventDate: lastEvent?.startsAt,
      };
    } catch (error) {
      console.error("Error in findOneForAdmin:", error);
      throw new NotFoundException("Organiser not found");
    }
  }

  async createForAdmin(
    createDto: CreateOrganiserDto & { ownerId: string },
    adminId: string,
  ): Promise<Organiser> {
    // Verify the owner exists
    const owner = await this.userRepository.findOne({
      where: { id: createDto.ownerId },
    });

    if (!owner) {
      throw new NotFoundException("Owner user not found");
    }

    const organiser = this.organiserRepository.create({
      id: uuidv4(),
      ownerId: createDto.ownerId,
      name: createDto.name,
      description: createDto.description,
      logoUrl: createDto.logoUrl,
      metadata: {
        ...createDto.metadata,
        createdByAdmin: adminId,
      },
    });

    return this.organiserRepository.save(organiser);
  }

  async updateForAdmin(
    id: string,
    updateDto: Partial<CreateOrganiserDto>,
    adminId: string,
  ): Promise<Organiser> {
    const organiser = await this.organiserRepository.findOne({
      where: { id },
      relations: ["owner"],
    });

    if (!organiser) {
      throw new NotFoundException("Organiser not found");
    }

    await this.organiserRepository.update(id, {
      ...updateDto,
      metadata: {
        ...organiser.metadata,
        ...updateDto.metadata,
        lastModifiedByAdmin: adminId,
        lastModifiedAt: new Date().toISOString(),
      } as any,
    });

    return this.findOneForAdmin(id);
  }

  async deleteForAdmin(id: string, adminId: string): Promise<void> {
    const organiser = await this.organiserRepository.findOne({
      where: { id },
      relations: ["events"],
    });

    if (!organiser) {
      throw new NotFoundException("Organiser not found");
    }

    // Check if organiser has active events
    const activeEvents = organiser.events?.filter((event) =>
      ["PUBLISHED", "APPROVED"].includes(event.status),
    );

    if (activeEvents && activeEvents.length > 0) {
      throw new ForbiddenException(
        "Cannot delete organiser with active events",
      );
    }

    await this.organiserRepository.remove(organiser);
  }

  async updateOrganiserStatus(
    id: string,
    status: "active" | "suspended" | "inactive",
    reason?: string,
    adminId?: string,
  ): Promise<Organiser> {
    const organiser = await this.organiserRepository.findOne({
      where: { id },
    });

    if (!organiser) {
      throw new NotFoundException("Organiser not found");
    }

    await this.organiserRepository.update(id, {
      metadata: {
        ...organiser.metadata,
        status,
        statusReason: reason,
        statusChangedBy: adminId,
        statusChangedAt: new Date().toISOString(),
      } as any,
    });

    return this.findOneForAdmin(id);
  }

  async getOrganiserStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    newThisMonth: number;
    topByRevenue: Array<{ id: string; name: string; revenue: number }>;
    topByEvents: Array<{ id: string; name: string; eventsCount: number }>;
  }> {
    try {
      const total = await this.organiserRepository.count();

      // For now, assume most organisers are active since status tracking might not be fully implemented
      const active = total; // Simplified for now
      const suspended = 0; // Simplified for now

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newThisMonth = await this.organiserRepository.count({
        where: {
          createdAt: MoreThan(thirtyDaysAgo),
        },
      });

      // Get top organisers by events count (simplified to avoid complex joins)
      const topByEvents = await this.organiserRepository
        .createQueryBuilder("organiser")
        .leftJoin("organiser.events", "event")
        .select("organiser.id", "id")
        .addSelect("organiser.name", "name")
        .addSelect("COUNT(event.id)", "eventsCount")
        .groupBy("organiser.id")
        .addGroupBy("organiser.name")
        .orderBy("COUNT(event.id)", "DESC")
        .limit(5)
        .getRawMany();

      // Simplified revenue calculation (can be enhanced later)
      const topByRevenue = topByEvents.map((item) => ({
        id: item.id,
        name: item.name,
        revenue: parseInt(item.eventsCount || 0) * 1000, // Simplified calculation
      }));

      return {
        total,
        active,
        suspended,
        newThisMonth,
        topByRevenue: topByRevenue.slice(0, 5),
        topByEvents: topByEvents.map((item) => ({
          id: item.id,
          name: item.name,
          eventsCount: parseInt(item.eventsCount) || 0,
        })),
      };
    } catch (error) {
      // Return default values if query fails
      console.error("Error in getOrganiserStats:", error);
      return {
        total: 0,
        active: 0,
        suspended: 0,
        newThisMonth: 0,
        topByRevenue: [],
        topByEvents: [],
      };
    }
  }

  async getOrganiserAnalytics(
    id: string,
    period: string,
  ): Promise<{
    revenue: { date: string; amount: number }[];
    events: { date: string; count: number }[];
    tickets: { date: string; sold: number }[];
    topEvents: Array<{
      id: string;
      title: string;
      revenue: number;
      ticketsSold: number;
    }>;
  }> {
    const organiser = await this.organiserRepository.findOne({
      where: { id },
      relations: ["events", "events.ticketTypes"],
    });

    if (!organiser) {
      throw new NotFoundException("Organiser not found");
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Filter events within the period
    const periodEvents =
      organiser.events?.filter(
        (event) => new Date(event.createdAt) >= startDate,
      ) || [];

    // Generate analytics data (simplified version)
    const revenue = this.generateDateSeries(
      startDate,
      endDate,
      periodEvents,
      "revenue",
    );
    const events = this.generateDateSeries(
      startDate,
      endDate,
      periodEvents,
      "events",
    );
    const tickets = this.generateDateSeries(
      startDate,
      endDate,
      periodEvents,
      "tickets",
    );

    // Top events by revenue
    const topEvents =
      organiser.events
        ?.map((event) => ({
          id: event.id,
          title: event.title,
          revenue:
            (event.ticketTypes?.reduce(
              (total, tt) =>
                total + ((tt as any).sold || 0) * ((tt as any).priceCents || 0),
              0,
            ) || 0) / 100,
          ticketsSold:
            event.ticketTypes?.reduce(
              (total, tt) => total + ((tt as any).sold || 0),
              0,
            ) || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) || [];

    return {
      revenue: revenue.map((r) => ({
        date: r.date,
        amount: r.amount || 0,
      })),
      events: events.map((e) => ({
        date: e.date,
        count: e.count || 0,
      })),
      tickets: tickets.map((t) => ({
        date: t.date,
        sold: t.sold || 0,
      })),
      topEvents,
    };
  }

  private generateDateSeries(
    startDate: Date,
    endDate: Date,
    events: Event[],
    type: "revenue" | "events" | "tickets",
  ): any[] {
    const series: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayEvents = events.filter(
        (event) =>
          new Date(event.createdAt).toDateString() ===
          currentDate.toDateString(),
      );

      let value = 0;
      if (type === "revenue") {
        value =
          dayEvents.reduce(
            (total, event) =>
              total +
              (event.ticketTypes?.reduce(
                (eventTotal, tt) =>
                  eventTotal +
                  ((tt as any).sold || 0) * ((tt as any).priceCents || 0),
                0,
              ) || 0),
            0,
          ) / 100;
      } else if (type === "events") {
        value = dayEvents.length;
      } else if (type === "tickets") {
        value = dayEvents.reduce(
          (total, event) =>
            total +
            (event.ticketTypes?.reduce(
              (eventTotal, tt) => eventTotal + ((tt as any).sold || 0),
              0,
            ) || 0),
          0,
        );
      }

      if (type === "revenue") {
        series.push({
          date: dateStr,
          amount: value,
        });
      } else if (type === "events") {
        series.push({
          date: dateStr,
          count: value,
        });
      } else if (type === "tickets") {
        series.push({
          date: dateStr,
          sold: value,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return series;
  }
}
