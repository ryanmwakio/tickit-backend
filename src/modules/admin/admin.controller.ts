import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { EventsService } from '../events/events.service';
import { OrganiserApplicationsService } from '../organiser-applications/organiser-applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { EventStatus } from '../../database/entities/event.entity';
import { PaymentStatus } from '../../database/entities/payment.entity';
import { RefundStatus } from '../../database/entities/refund.entity';
import { TicketStatus } from '../../database/entities/ticket.entity';
import { UuidParamDto } from '../../common/dto/uuid-param.dto';
import { ApproveEventDto } from './dto/approve-event.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly eventsService: EventsService,
    private readonly organiserApplicationsService: OrganiserApplicationsService,
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(@CurrentUser() user: User) {
    return this.adminService.getDashboardStats(user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users list' })
  async getUsers(@Query() query: any) {
    return this.adminService.getUsers(query);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create admin user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Admin user created' })
  @HttpCode(HttpStatus.CREATED)
  async createAdminUser(
    @CurrentUser() user: User,
    @Body() createDto: {
      email: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      roles?: string;
      activeRole?: UserRole;
      metadata?: Record<string, any>;
    },
  ) {
    return this.adminService.createAdminUser(user.id, createDto);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update admin user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin user updated' })
  async updateAdminUser(
    @CurrentUser() user: User,
    @Param('id') targetUserId: string,
    @Body() updateDto: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      roles?: string;
      activeRole?: UserRole;
      metadata?: Record<string, any>;
    },
  ) {
    return this.adminService.updateAdminUser(user.id, targetUserId, updateDto);
  }

  @Put('events/:id/featured')
  @ApiOperation({ summary: 'Set event as featured (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event featured status updated' })
  async setEventFeatured(
    @CurrentUser() user: User,
    @Param('id') eventId: string,
    @Body() body: { featured: boolean },
  ) {
    return this.adminService.setEventFeatured(user.id, eventId, body.featured);
  }

  @Put('events/:id/live-pulse')
  @ApiOperation({ summary: 'Set event as live pulse (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event live pulse status updated' })
  async setEventLivePulse(
    @CurrentUser() user: User,
    @Param('id') eventId: string,
    @Body() body: { livePulse: boolean },
  ) {
    return this.adminService.setEventLivePulse(user.id, eventId, body.livePulse);
  }

  @Get('events/stats')
  @ApiOperation({ summary: 'Get event statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event statistics' })
  async getEventStats(@CurrentUser() user: User) {
    return this.adminService.getEventStats(user.id);
  }

  @Get('events')
  @ApiOperation({ summary: 'List all events (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EventStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'livePulse', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Events list' })
  async getEvents(@Query() query: any) {
    return this.adminService.getEvents(query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiResponse({ status: 200, description: 'Payments list' })
  async getPayments(@Query() query: any) {
    return this.adminService.getPayments(query);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List all refunds (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RefundStatus })
  @ApiResponse({ status: 200, description: 'Refunds list' })
  async getRefunds(@Query() query: any) {
    return this.adminService.getRefunds(query);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List all tickets (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Tickets list' })
  async getTickets(@Query() query: any) {
    return this.adminService.getTickets(query);
  }

  @Get('refunds/recent')
  @ApiOperation({ summary: 'Get recent pending refunds (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent refunds' })
  async getRecentRefunds(@Query('limit') limit?: number) {
    return this.adminService.getRecentRefunds(limit);
  }

  @Get('payouts/organisers')
  @ApiOperation({ summary: 'Get organiser payouts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organiser payouts' })
  async getOrganiserPayouts() {
    return this.adminService.getOrganiserPayouts();
  }

  @Post('events/:id/approve')
  @ApiOperation({ summary: 'Approve event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event approved' })
  @HttpCode(HttpStatus.OK)
  async approveEvent(
    @Param() params: UuidParamDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.approveEvent(params.id, user.id);
  }

  @Post('events/:id/reject')
  @ApiOperation({ summary: 'Reject event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event rejected' })
  @HttpCode(HttpStatus.OK)
  async rejectEvent(
    @Param() params: UuidParamDto,
    @Body() rejectDto: ApproveEventDto,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.rejectEvent(params.id, user.id, rejectDto.reason);
  }

  @Get('checkins')
  @ApiOperation({ summary: 'List all check-ins (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'eventId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Check-ins list' })
  async getCheckins(@Query() query: any) {
    return this.adminService.getCheckins(query);
  }

  @Get('checkins/stats')
  @ApiOperation({ summary: 'Get check-in statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Check-in stats' })
  async getCheckinStats() {
    return this.adminService.getCheckinStats();
  }

  @Get('analytics/platform')
  @ApiOperation({ summary: 'Get platform-wide analytics (Admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  @ApiResponse({ status: 200, description: 'Platform analytics' })
  async getPlatformAnalytics(@Query('days') days?: string) {
    const daysNum = parseInt(days || '30', 10);
    return this.adminService.getPlatformAnalytics(daysNum);
  }

  @Get('dashboard/analytics')
  @ApiOperation({ summary: 'Get dashboard analytics for charts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  async getDashboardAnalytics(@CurrentUser() user: User) {
    return this.adminService.getDashboardAnalytics(user.id);
  }

  @Get('marketing/promo-codes')
  @ApiOperation({ summary: 'Get all promo codes (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Promo codes list' })
  async getAllPromoCodes(@Query() query: any) {
    return this.adminService.getAllPromoCodes(query);
  }

  @Get('marketing/campaigns')
  @ApiOperation({ summary: 'Get all campaigns (Admin only)' })
  @ApiResponse({ status: 200, description: 'Campaigns list' })
  async getAllCampaigns() {
    return this.adminService.getAllCampaigns();
  }

  @Get('marketing/affiliates')
  @ApiOperation({ summary: 'Get all affiliates (Admin only)' })
  @ApiResponse({ status: 200, description: 'Affiliates list' })
  async getAllAffiliates() {
    return this.adminService.getAllAffiliates();
  }

  @Get('featured/pricing')
  @ApiOperation({ summary: 'Get featured event pricing (Admin only)' })
  @ApiResponse({ status: 200, description: 'Featured pricing' })
  async getFeaturedPricing(@CurrentUser() user: User) {
    return this.adminService.getFeaturedPricing(user.id);
  }

  @Put('featured/pricing')
  @ApiOperation({ summary: 'Set featured event pricing (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pricing updated' })
  async setFeaturedPricing(@CurrentUser() user: User, @Body() body: { costPerDayCents: number }) {
    return this.adminService.setFeaturedPricing(user.id, body.costPerDayCents);
  }

  @Get('featured/requests')
  @ApiOperation({ summary: 'List featured requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Featured requests list' })
  async getFeaturedRequests(@CurrentUser() user: User, @Query() query: any) {
    return this.adminService.getFeaturedRequests(user.id, query);
  }

  @Post('featured/requests/:id/approve')
  @ApiOperation({ summary: 'Approve featured request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveFeaturedRequest(@CurrentUser() user: User, @Param('id') id: string, @Body() body?: { notes?: string }) {
    return this.adminService.approveFeaturedRequest(user.id, id, body?.notes);
  }

  @Post('featured/requests/:id/reject')
  @ApiOperation({ summary: 'Reject featured request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectFeaturedRequest(@CurrentUser() user: User, @Param('id') id: string, @Body() body?: { notes?: string }) {
    return this.adminService.rejectFeaturedRequest(user.id, id, body?.notes);
  }

  @Delete('events/:id/featured')
  @ApiOperation({ summary: 'Remove featured status from event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Featured status removed' })
  async removeFeaturedStatus(@CurrentUser() user: User, @Param('id') id: string) {
    return this.adminService.removeFeaturedStatus(user.id, id);
  }

  @Get('organiser-applications')
  @ApiOperation({ summary: 'List organiser applications (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Applications list' })
  async getOrganiserApplications(
    @CurrentUser() user: User,
    @Query() query: any,
  ) {
    return this.organiserApplicationsService.getApplications(query);
  }

  @Get('organiser-applications/:id')
  @ApiOperation({ summary: 'Get organiser application by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application details' })
  async getOrganiserApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.organiserApplicationsService.getApplication(id);
  }

  @Post('organiser-applications/:id/approve')
  @ApiOperation({ summary: 'Approve organiser application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application approved' })
  async approveOrganiserApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body?: { notes?: string },
  ) {
    return this.organiserApplicationsService.approveApplication(id, user.id, body?.notes);
  }

  @Post('organiser-applications/:id/reject')
  @ApiOperation({ summary: 'Reject organiser application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Application rejected' })
  async rejectOrganiserApplication(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body?: { notes?: string },
  ) {
    return this.organiserApplicationsService.rejectApplication(id, user.id, body?.notes);
  }
}

