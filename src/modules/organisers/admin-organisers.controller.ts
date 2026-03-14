import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { OrganisersService } from "./organisers.service";
import { CreateOrganiserDto } from "./dto/create-organiser.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, UserRole } from "../../database/entities/user.entity";
import { EventsService } from "../events/events.service";

@ApiTags("admin-organisers")
@Controller("admin/organisers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminOrganisersController {
  constructor(
    private readonly organisersService: OrganisersService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all organisers (Admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["active", "suspended", "inactive"],
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["name", "createdAt", "eventsCount"],
  })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiResponse({
    status: 200,
    description: "Organisers list with pagination and stats",
  })
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || "1", 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20", 10)));
      return await this.organisersService.findAllForAdmin({
        page: pageNum,
        limit: limitNum,
        search,
        status: status as "active" | "suspended" | "inactive",
        sortBy: sortBy as "name" | "createdAt" | "eventsCount",
        sortOrder: sortOrder as "asc" | "desc",
      });
    } catch (error: any) {
      console.error("Error getting organisers list:", error);
      throw error;
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Get organiser statistics (Admin only)" })
  @ApiResponse({ status: 200, description: "Organiser statistics" })
  async getStats() {
    try {
      return await this.organisersService.getOrganiserStats();
    } catch (error: any) {
      console.error("Error getting organiser stats:", error);
      throw error;
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Get organiser by ID (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "Organiser details with events and analytics",
  })
  @ApiResponse({ status: 404, description: "Organiser not found" })
  async findOne(@Param("id") id: string) {
    try {
      return await this.organisersService.findOneForAdmin(id);
    } catch (error: any) {
      console.error(`Error getting organiser ${id}:`, error);
      throw error;
    }
  }

  @Get(":id/events")
  @ApiOperation({ summary: "Get organiser events (Admin only)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Organiser events list" })
  async getOrganiserEvents(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    try {
      console.log(`Admin requesting events for organiser: ${id}`);
      console.log("Query params:", { page, limit, status, search });

      const pageNum = Math.max(1, parseInt(page || "1", 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20", 10)));

      const result = await this.eventsService.findByOrganiserForAdmin(id, {
        page: pageNum,
        limit: limitNum,
        status,
        search,
      });

      console.log(`Successfully returned ${result.data?.length || 0} events`);
      return result;
    } catch (error: any) {
      console.error("Error in getOrganiserEvents controller:", error);
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: "Create organiser (Admin only)" })
  @ApiResponse({ status: 201, description: "Organiser created" })
  async create(
    @Body() createDto: CreateOrganiserDto & { ownerId: string },
    @CurrentUser() user: User,
  ) {
    return this.organisersService.createForAdmin(createDto, user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update organiser (Admin only)" })
  @ApiResponse({ status: 200, description: "Organiser updated" })
  @ApiResponse({ status: 404, description: "Organiser not found" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: Partial<CreateOrganiserDto>,
    @CurrentUser() user: User,
  ) {
    return this.organisersService.updateForAdmin(id, updateDto, user.id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update organiser status (Admin only)" })
  @ApiResponse({ status: 200, description: "Organiser status updated" })
  async updateStatus(
    @Param("id") id: string,
    @Body()
    body: { status: "active" | "suspended" | "inactive"; reason?: string },
    @CurrentUser() user: User,
  ) {
    return this.organisersService.updateOrganiserStatus(
      id,
      body.status,
      body.reason,
      user.id,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete organiser (Admin only)" })
  @ApiResponse({ status: 204, description: "Organiser deleted" })
  @ApiResponse({ status: 404, description: "Organiser not found" })
  async delete(@Param("id") id: string, @CurrentUser() user: User) {
    await this.organisersService.deleteForAdmin(id, user.id);
  }

  @Post(":id/events/:eventId/publish")
  @ApiOperation({ summary: "Publish event (Admin only)" })
  @ApiResponse({ status: 200, description: "Event published" })
  async publishEvent(
    @Param("id") organiserId: string,
    @Param("eventId") eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.publishEventAsAdmin(eventId, user.id);
  }

  @Post(":id/events/:eventId/unpublish")
  @ApiOperation({ summary: "Unpublish event (Admin only)" })
  @ApiResponse({ status: 200, description: "Event unpublished" })
  async unpublishEvent(
    @Param("id") organiserId: string,
    @Param("eventId") eventId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: User,
  ) {
    return this.eventsService.unpublishEventAsAdmin(
      eventId,
      body.reason,
      user.id,
    );
  }

  @Post(":id/events/:eventId/approve")
  @ApiOperation({ summary: "Approve event (Admin only)" })
  @ApiResponse({ status: 200, description: "Event approved" })
  async approveEvent(
    @Param("id") organiserId: string,
    @Param("eventId") eventId: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: User,
  ) {
    return this.eventsService.approveEventAsAdmin(eventId, body.notes, user.id);
  }

  @Post(":id/events/:eventId/reject")
  @ApiOperation({ summary: "Reject event (Admin only)" })
  @ApiResponse({ status: 200, description: "Event rejected" })
  async rejectEvent(
    @Param("id") organiserId: string,
    @Param("eventId") eventId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: User,
  ) {
    return this.eventsService.rejectEventAsAdmin(eventId, body.reason, user.id);
  }

  @Get(":id/analytics")
  @ApiOperation({ summary: "Get organiser analytics (Admin only)" })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["7d", "30d", "90d", "1y"],
  })
  @ApiResponse({ status: 200, description: "Organiser analytics data" })
  async getAnalytics(
    @Param("id") id: string,
    @Query("period") period?: string,
  ) {
    return this.organisersService.getOrganiserAnalytics(id, period || "30d");
  }
}
