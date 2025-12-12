import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganiserDashboardService } from './organiser-dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { EventStatus } from '../../database/entities/event.entity';

@ApiTags('organisers')
@Controller('organisers/:organiserId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganiserDashboardController {
  constructor(private readonly dashboardService: OrganiserDashboardService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get organiser dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getDashboardStats(organiserId, user.id);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get organiser events' })
  @ApiQuery({ name: 'status', required: false, enum: EventStatus })
  @ApiResponse({ status: 200, description: 'Events list' })
  async getEvents(
    @Param('organiserId') organiserId: string,
    @Query('status') status: EventStatus,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getEvents(organiserId, user.id, status);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get organiser orders' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of orders to skip' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of orders to take' })
  @ApiResponse({ status: 200, description: 'Orders list with pagination' })
  async getOrders(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = Math.max(0, parseInt(skip || '0', 10));
    const takeNum = Math.min(100, Math.max(1, parseInt(take || '9', 10)));
    return this.dashboardService.getOrders(organiserId, user.id, skipNum, takeNum);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get organiser refunds' })
  @ApiResponse({ status: 200, description: 'Refunds list' })
  async getRefunds(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getRefunds(organiserId, user.id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get organiser customers' })
  @ApiResponse({ status: 200, description: 'Customers list' })
  async getCustomers(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getCustomers(organiserId, user.id);
  }

  @Patch('customers/:customerId')
  @ApiOperation({ summary: 'Update customer information' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async updateCustomer(
    @Param('organiserId') organiserId: string,
    @Param('customerId') customerId: string,
    @Body() updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      metadata?: Record<string, any>;
    },
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.updateCustomer(organiserId, user.id, customerId, updateData);
  }

  @Patch('customers/:customerId/block')
  @ApiOperation({ summary: 'Block or unblock a customer' })
  @ApiResponse({ status: 200, description: 'Customer blocked/unblocked' })
  async blockCustomer(
    @Param('organiserId') organiserId: string,
    @Param('customerId') customerId: string,
    @Body('blocked') blocked: boolean,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.blockCustomer(organiserId, user.id, customerId, blocked);
  }

  @Get('checkin/stats')
  @ApiOperation({ summary: 'Get check-in statistics for organiser' })
  @ApiQuery({ name: 'eventId', required: false, type: String, description: 'Filter by event ID' })
  @ApiResponse({ status: 200, description: 'Check-in statistics' })
  async getCheckInStats(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Query('eventId') eventId?: string,
  ) {
    return this.dashboardService.getCheckInStats(organiserId, user.id, eventId);
  }

  @Get('checkin/gates')
  @ApiOperation({ summary: 'Get gate activity for organiser' })
  @ApiQuery({ name: 'eventId', required: false, type: String, description: 'Filter by event ID' })
  @ApiResponse({ status: 200, description: 'Gate activity list' })
  async getGateActivity(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Query('eventId') eventId?: string,
  ) {
    return this.dashboardService.getGateActivity(organiserId, user.id, eventId);
  }

  @Get('checkin/devices')
  @ApiOperation({ summary: 'Get device status for organiser' })
  @ApiResponse({ status: 200, description: 'Device status list' })
  async getDeviceStatus(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getDeviceStatus(organiserId, user.id);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get registered devices for organiser' })
  @ApiResponse({ status: 200, description: 'Registered devices list' })
  async getRegisteredDevices(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getRegisteredDevices(organiserId, user.id);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 200, description: 'Device registered' })
  async registerDevice(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Body() deviceData: {
      deviceId: string;
      deviceName: string;
      deviceType: string;
      gateId?: string;
      permissions: {
        canScan: boolean;
        canVoid: boolean;
        canRefund: boolean;
      };
    },
  ) {
    return this.dashboardService.registerDevice(organiserId, user.id, deviceData);
  }

  @Patch('devices/:deviceId')
  @ApiOperation({ summary: 'Update device' })
  @ApiResponse({ status: 200, description: 'Device updated' })
  async updateDevice(
    @Param('organiserId') organiserId: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
    @Body() updateData: {
      deviceName?: string;
      deviceType?: string;
      gateId?: string;
      status?: string;
      permissions?: {
        canScan: boolean;
        canVoid: boolean;
        canRefund: boolean;
      };
    },
  ) {
    return this.dashboardService.updateDevice(organiserId, user.id, deviceId, updateData);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Delete device' })
  @ApiResponse({ status: 200, description: 'Device deleted' })
  async deleteDevice(
    @Param('organiserId') organiserId: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.deleteDevice(organiserId, user.id, deviceId);
  }

  @Get('gates')
  @ApiOperation({ summary: 'Get registered gates for organiser' })
  @ApiResponse({ status: 200, description: 'Registered gates list' })
  async getRegisteredGates(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getRegisteredGates(organiserId, user.id);
  }

  @Post('gates')
  @ApiOperation({ summary: 'Create a new gate' })
  @ApiResponse({ status: 200, description: 'Gate created' })
  async createGate(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Body() gateData: {
      name: string;
      gateNumber: string;
      gateType: string;
      allowedTicketTypes?: string[];
      entryRestrictions: {
        earlyCheckIn: boolean;
        lateEntry: boolean;
        reEntry: boolean;
      };
    },
  ) {
    return this.dashboardService.createGate(organiserId, user.id, gateData);
  }

  @Patch('gates/:gateId')
  @ApiOperation({ summary: 'Update gate' })
  @ApiResponse({ status: 200, description: 'Gate updated' })
  async updateGate(
    @Param('organiserId') organiserId: string,
    @Param('gateId') gateId: string,
    @CurrentUser() user: User,
    @Body() updateData: {
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
    },
  ) {
    return this.dashboardService.updateGate(organiserId, user.id, gateId, updateData);
  }

  @Delete('gates/:gateId')
  @ApiOperation({ summary: 'Delete gate' })
  @ApiResponse({ status: 200, description: 'Gate deleted' })
  async deleteGate(
    @Param('organiserId') organiserId: string,
    @Param('gateId') gateId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.deleteGate(organiserId, user.id, gateId);
  }

  @Get('finance/revenue')
  @ApiOperation({ summary: 'Get revenue overview' })
  @ApiResponse({ status: 200, description: 'Revenue overview' })
  async getRevenueOverview(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getRevenueOverview(organiserId, user.id);
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: 'Get transactions' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions list' })
  async getTransactions(
    @Param('organiserId') organiserId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @CurrentUser() user?: User,
  ) {
    return this.dashboardService.getTransactions(
      organiserId,
      user?.id || '',
      parseInt(skip || '0', 10),
      parseInt(take || '50', 10),
    );
  }

  @Get('finance/wallet')
  @ApiOperation({ summary: 'Get wallet and payouts' })
  @ApiResponse({ status: 200, description: 'Wallet and payouts' })
  async getWalletPayouts(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getWalletPayouts(organiserId, user.id);
  }

  @Post('finance/payouts')
  @ApiOperation({ summary: 'Request payout' })
  @ApiResponse({ status: 201, description: 'Payout requested' })
  async requestPayout(
    @Param('organiserId') organiserId: string,
    @Body() body: { amount: number; method: string; accountDetails?: Record<string, any> },
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.requestPayout(
      organiserId,
      user.id,
      body.amount,
      body.method,
      body.accountDetails,
    );
  }

  @Get('marketing/campaigns')
  @ApiOperation({ summary: 'Get marketing campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns list' })
  async getCampaigns(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getCampaigns(organiserId, user.id);
  }

  @Post('marketing/campaigns')
  @ApiOperation({ summary: 'Create marketing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @Param('organiserId') organiserId: string,
    @Body() body: {
      name: string;
      type: string;
      status: string;
      scheduledAt?: string;
      content?: string;
      targetAudience?: string[];
    },
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.createCampaign(organiserId, user.id, body);
  }

  @Get('marketing/affiliates')
  @ApiOperation({ summary: 'Get affiliates' })
  @ApiResponse({ status: 200, description: 'Affiliates list' })
  async getAffiliates(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getAffiliates(organiserId, user.id);
  }

  @Post('marketing/affiliates')
  @ApiOperation({ summary: 'Create affiliate' })
  @ApiResponse({ status: 201, description: 'Affiliate created' })
  async createAffiliate(
    @Param('organiserId') organiserId: string,
    @Body() body: {
      name: string;
      email?: string;
      commissionRate: number;
      code: string;
    },
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.createAffiliate(organiserId, user.id, body);
  }

  // Analytics Endpoints
  @Get('analytics/sales')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze (default: 180)' })
  @ApiResponse({ status: 200, description: 'Sales analytics data' })
  async getSalesAnalytics(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const daysNum = parseInt(days || '180', 10);
    return this.dashboardService.getSalesAnalytics(organiserId, user.id, daysNum);
  }

  @Get('analytics/customers')
  @ApiOperation({ summary: 'Get customer insights' })
  @ApiResponse({ status: 200, description: 'Customer insights data' })
  async getCustomerInsights(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getCustomerInsights(organiserId, user.id);
  }

  @Get('analytics/events')
  @ApiOperation({ summary: 'Get event performance analytics' })
  @ApiResponse({ status: 200, description: 'Event performance data' })
  async getEventPerformance(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getEventPerformance(organiserId, user.id);
  }

  @Get('analytics/finance')
  @ApiOperation({ summary: 'Get finance reports' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to analyze (default: 6)' })
  @ApiResponse({ status: 200, description: 'Finance reports data' })
  async getFinanceReports(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Query('months') months?: string,
  ) {
    const monthsNum = parseInt(months || '6', 10);
    return this.dashboardService.getFinanceReports(organiserId, user.id, monthsNum);
  }

  @Get('featured/pricing')
  @ApiOperation({ summary: 'Get featured event pricing' })
  @ApiResponse({ status: 200, description: 'Featured pricing' })
  async getFeaturedPricing(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getFeaturedPricing(organiserId, user.id);
  }

  @Post('featured/request')
  @ApiOperation({ summary: 'Request featured status for event' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async requestFeaturedEvent(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
    @Body() body: { eventId: string; days: number; startDate: string; endDate: string; notes?: string },
  ) {
    return this.dashboardService.requestFeaturedEvent(
      organiserId,
      user.id,
      body.eventId,
      body.days,
      new Date(body.startDate),
      new Date(body.endDate),
      body.notes,
    );
  }

  @Get('featured/requests')
  @ApiOperation({ summary: 'Get featured requests for organiser' })
  @ApiResponse({ status: 200, description: 'Featured requests' })
  async getFeaturedRequests(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getFeaturedRequests(organiserId, user.id);
  }
}

