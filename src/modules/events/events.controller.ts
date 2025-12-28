import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import type { Response } from "express";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventQueryDto } from "./dto/event-query.dto";
import { EventResponseDto } from "./dto/event-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { OptionalAuthInterceptor } from "../../common/interceptors/optional-auth.interceptor";
import { User } from "../../database/entities/user.entity";
import { PdfService } from "../../common/services/pdf.service";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly pdfService: PdfService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List events with filters" })
  @ApiResponse({
    status: 200,
    description: "Events list",
    type: [EventResponseDto],
  })
  async findAll(@Query() query: EventQueryDto, @CurrentUser() user?: User) {
    return this.eventsService.findAll(query, user?.id);
  }

  @Public()
  @Get("slug/:slug")
  @ApiOperation({ summary: "Get event by slug (explicit)" })
  @ApiResponse({
    status: 200,
    description: "Event details",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async findBySlug(@Param("slug") slug: string, @CurrentUser() user?: User) {
    return this.eventsService.findBySlug(slug, user?.id);
  }

  @Public()
  @Get(":id/brief")
  @ApiOperation({ summary: "Download event brief as PDF" })
  @ApiResponse({
    status: 200,
    description: "PDF file",
    content: { "application/pdf": {} },
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async downloadEventBrief(
    @Param("id") idOrSlug: string,
    @Res() res: Response,
    @CurrentUser() user?: User,
  ) {
    const event = await this.eventsService.findOne(idOrSlug, user?.id);

    // Format event date
    const eventDate = new Date(event.startsAt).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const eventTime = new Date(event.startsAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Prepare ticket types data
    const ticketTypes = (event.ticketTypes || []).map((ticketType: any) => ({
      name: ticketType.name || "Unknown",
      price:
        (ticketType.priceCents || 0) > 0
          ? `KES ${((ticketType.priceCents || 0) / 100).toLocaleString()}`
          : "Free",
      available: (ticketType.quantity || 0) - (ticketType.sold || 0),
      description: ticketType.description || "",
    }));

    const pdfBuffer = await this.pdfService.generateEventBriefPDF({
      eventTitle: event.title,
      description: event.description || "No description available",
      organizer:
        (event.organiser as any)?.businessName ||
        event.organiser?.name ||
        "Unknown Organizer",
      eventDate,
      eventTime,
      eventLocation:
        event.venue?.address || event.venue?.name || "Location TBA",
      venue: event.venue?.name || "Venue TBA",
      ticketTypes,
      category: event.category,
      tags: event.tags,
    });

    const filename = `${event.slug || event.title.toLowerCase().replace(/\s+/g, "-")}-brief.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  }

  @Public()
  @UseInterceptors(OptionalAuthInterceptor)
  @Get(":id")
  @ApiOperation({ summary: "Get event by ID or slug" })
  @ApiResponse({
    status: 200,
    description: "Event details",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async findOne(@Param("id") idOrSlug: string, @CurrentUser() user?: User) {
    return this.eventsService.findOne(idOrSlug, user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create event (Organiser only)" })
  @ApiResponse({
    status: 201,
    description: "Event created",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: "Access denied" })
  async create(
    @Body() createEventDto: CreateEventDto,
    @Query("organiserId") organiserId: string,
    @CurrentUser() user: User,
  ) {
    if (!organiserId) {
      throw new Error("organiserId is required");
    }
    return this.eventsService.create(organiserId, createEventDto, user.id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update event (Organiser only)" })
  @ApiResponse({
    status: 200,
    description: "Event updated",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Partially update event (Organiser only)" })
  @ApiResponse({
    status: 200,
    description: "Event updated",
    type: EventResponseDto,
  })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async patch(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.update(id, updateEventDto, user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete event (Organiser only)" })
  @ApiResponse({ status: 204, description: "Event deleted" })
  @ApiResponse({ status: 403, description: "Access denied" })
  @ApiResponse({ status: 404, description: "Event not found" })
  async delete(@Param("id") id: string, @CurrentUser() user: User) {
    await this.eventsService.delete(id, user.id);
  }

  @Post(":id/request-approval")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Request approval for event (Organiser only)" })
  @ApiResponse({ status: 200, description: "Approval requested" })
  async requestApproval(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.requestApproval(id, user.id);
  }
}
