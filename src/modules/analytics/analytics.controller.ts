import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../database/entities/user.entity";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("platform")
  @ApiOperation({ summary: "Get public platform analytics for home page" })
  @ApiResponse({ status: 200, description: "Platform analytics data" })
  async getPlatformAnalytics() {
    return this.analyticsService.getPlatformAnalytics();
  }

  @Get("platform/stats")
  @ApiOperation({ summary: "Get platform statistics summary" })
  @ApiResponse({ status: 200, description: "Platform statistics" })
  async getPlatformStats() {
    return this.analyticsService.getPlatformStats();
  }

  @Get("events/:eventId")
  @ApiOperation({ summary: "Get event analytics" })
  @ApiResponse({ status: 200, description: "Event analytics" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getEventAnalytics(
    @Param("eventId") eventId: string,
    @Query("organiserId") organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getEventAnalytics(
      eventId,
      organiserId || user.id,
    );
  }

  @Get("organisers/:organiserId")
  @ApiOperation({ summary: "Get organiser analytics" })
  @ApiResponse({ status: 200, description: "Organiser analytics" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getOrganiserAnalytics(@Param("organiserId") organiserId: string) {
    return this.analyticsService.getOrganiserAnalytics(organiserId);
  }

  @Get("organisers/:organiserId/sales-trend")
  @ApiOperation({ summary: "Get sales trend for organiser" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days (default: 30)",
  })
  @ApiResponse({ status: 200, description: "Sales trend data" })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSalesTrend(
    @Param("organiserId") organiserId: string,
    @Query("days") days: number = 30,
  ) {
    return this.analyticsService.getSalesTrend(organiserId, days);
  }
}
