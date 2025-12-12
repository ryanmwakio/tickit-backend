import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrganiserApplication, OrganiserApplicationStatus } from '../../database/entities/organiser-application.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeNotificationService } from '../../common/services/realtime-notification.service';
import { NotificationType as NotificationPayloadType } from '../../common/types/notification.types';
import { NotificationType } from '../../database/entities/notification.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class OrganiserApplicationsService {
  private readonly logger = new Logger(OrganiserApplicationsService.name);

  constructor(
    @InjectRepository(OrganiserApplication)
    private applicationRepository: Repository<OrganiserApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private realtimeNotificationService: RealtimeNotificationService,
  ) {}

  async createApplication(data: {
    name: string;
    organisation: string;
    email: string;
    phoneNumber?: string;
    eventDetails: string;
    userId?: string;
  }): Promise<OrganiserApplication> {
    // Check if user exists (if userId provided)
    let user: User | null = null;
    if (data.userId) {
      user = await this.userRepository.findOne({
        where: { id: data.userId },
      });
    }

    // Check if email already has a pending application
    const existingApplication = await this.applicationRepository.findOne({
      where: {
        email: data.email,
        status: OrganiserApplicationStatus.PENDING,
      },
    });

    if (existingApplication) {
      throw new ForbiddenException('You already have a pending application');
    }

    const application = this.applicationRepository.create({
      id: uuidv4(),
      userId: user?.id,
      name: data.name,
      organisation: data.organisation,
      email: data.email,
      phoneNumber: data.phoneNumber,
      eventDetails: data.eventDetails,
      status: OrganiserApplicationStatus.PENDING,
    });

    const saved = await this.applicationRepository.save(application);

    // Notify all admins
    await this.notifyAdminsOfApplication(saved);

    return saved;
  }

  async getApplications(query: {
    page?: number;
    limit?: number;
    status?: OrganiserApplicationStatus;
  }): Promise<{
    data: OrganiserApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status } = query;
    const where = status ? { status } : {};

    const [applications, total] = await this.applicationRepository.findAndCount({
      where,
      relations: ['user', 'reviewer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApplication(id: string): Promise<OrganiserApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user', 'reviewer'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async approveApplication(
    id: string,
    reviewerId: string,
    notes?: string,
  ): Promise<OrganiserApplication> {
    const application = await this.getApplication(id);

    if (application.status !== OrganiserApplicationStatus.PENDING) {
      throw new ForbiddenException('Application is not pending');
    }

    await this.applicationRepository.update(id, {
      status: OrganiserApplicationStatus.APPROVED,
      reviewedBy: reviewerId,
      adminNotes: notes,
    });

    return this.getApplication(id);
  }

  async rejectApplication(
    id: string,
    reviewerId: string,
    notes?: string,
  ): Promise<OrganiserApplication> {
    const application = await this.getApplication(id);

    if (application.status !== OrganiserApplicationStatus.PENDING) {
      throw new ForbiddenException('Application is not pending');
    }

    await this.applicationRepository.update(id, {
      status: OrganiserApplicationStatus.REJECTED,
      reviewedBy: reviewerId,
      adminNotes: notes,
    });

    return this.getApplication(id);
  }

  private async notifyAdminsOfApplication(application: OrganiserApplication): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { activeRole: UserRole.ADMIN },
        select: ['id'],
      });

      if (adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about organiser application');
        return;
      }

      // Send real-time notification to admin room
      await this.realtimeNotificationService.notifyAdmins({
        id: `organiser-application-${application.id}-${Date.now()}`,
        type: NotificationPayloadType.SYSTEM_ALERT,
        title: 'New Organiser Application',
        message: `${application.name} from ${application.organisation} has submitted an application to host on Tixhub`,
        metadata: {
          applicationId: application.id,
          name: application.name,
          organisation: application.organisation,
          email: application.email,
          link: `/admin/organiser-applications`,
        },
        timestamp: new Date(),
      });

      // Create persistent notifications for each admin
      const notificationPromises = adminUsers.map((admin) =>
        this.notificationsService.createNotification({
          userId: admin.id,
          title: 'New Organiser Application',
          message: `${application.name} from ${application.organisation} has submitted an application to host on Tixhub`,
          type: NotificationType.SYSTEM_ALERT,
          metadata: {
            applicationId: application.id,
            name: application.name,
            organisation: application.organisation,
            email: application.email,
            link: `/admin/organiser-applications`,
          },
        }),
      );

      await Promise.allSettled(notificationPromises);
      this.logger.log(`Notified ${adminUsers.length} admin(s) about organiser application: ${application.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to notify admins of organiser application: ${error.message}`);
    }
  }
}

