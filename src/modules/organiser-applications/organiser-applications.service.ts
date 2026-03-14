import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import {
  OrganiserApplication,
  OrganiserApplicationStatus,
} from "../../database/entities/organiser-application.entity";
import {
  User,
  UserRole,
  UserStatus,
} from "../../database/entities/user.entity";
import { Organiser } from "../../database/entities/organiser.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeNotificationService } from "../../common/services/realtime-notification.service";
import { NotificationType as NotificationPayloadType } from "../../common/types/notification.types";
import { NotificationType } from "../../database/entities/notification.entity";
import { Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";

@Injectable()
export class OrganiserApplicationsService {
  private readonly logger = new Logger(OrganiserApplicationsService.name);

  constructor(
    @InjectRepository(OrganiserApplication)
    private applicationRepository: Repository<OrganiserApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organiser)
    private organiserRepository: Repository<Organiser>,
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
      throw new ForbiddenException("You already have a pending application");
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

    const [applications, total] = await this.applicationRepository.findAndCount(
      {
        where,
        relations: ["user", "reviewer"],
        order: { createdAt: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

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
      relations: ["user", "reviewer"],
    });

    if (!application) {
      throw new NotFoundException("Application not found");
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
      throw new ForbiddenException("Application is not pending");
    }

    // Create or update user account and organiser profile
    const { user, organiser } = await this.createOrganiserAccount(application);

    // Update application status
    await this.applicationRepository.update(id, {
      status: OrganiserApplicationStatus.APPROVED,
      reviewedBy: reviewerId,
      adminNotes: notes,
      userId: user.id, // Link the application to the created user if it wasn't linked before
    });

    // Notify the new organiser
    await this.notifyApprovedOrganiser(application, user, organiser);

    return this.getApplication(id);
  }

  async rejectApplication(
    id: string,
    reviewerId: string,
    notes?: string,
  ): Promise<OrganiserApplication> {
    const application = await this.getApplication(id);

    if (application.status !== OrganiserApplicationStatus.PENDING) {
      throw new ForbiddenException("Application is not pending");
    }

    await this.applicationRepository.update(id, {
      status: OrganiserApplicationStatus.REJECTED,
      reviewedBy: reviewerId,
      adminNotes: notes,
    });

    return this.getApplication(id);
  }

  private async notifyAdminsOfApplication(
    application: OrganiserApplication,
  ): Promise<void> {
    try {
      // Get all admin users
      const adminUsers = await this.userRepository.find({
        where: { activeRole: UserRole.ADMIN },
        select: ["id"],
      });

      if (adminUsers.length === 0) {
        this.logger.warn(
          "No admin users found to notify about organiser application",
        );
        return;
      }

      // Send real-time notification to admin room
      await this.realtimeNotificationService.notifyAdmins({
        id: `organiser-application-${application.id}-${Date.now()}`,
        type: NotificationPayloadType.SYSTEM_ALERT,
        title: "New Organiser Application",
        message: `${application.name} from ${application.organisation} has submitted an application to host on Tickit`,
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
          title: "New Organiser Application",
          message: `${application.name} from ${application.organisation} has submitted an application to host on Tickit`,
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
      this.logger.log(
        `Notified ${adminUsers.length} admin(s) about organiser application: ${application.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to notify admins of organiser application: ${error.message}`,
      );
    }
  }

  private async createOrganiserAccount(
    application: OrganiserApplication,
  ): Promise<{ user: User; organiser: Organiser }> {
    let user: User;

    // Check if user already exists with this email
    const existingUser = await this.userRepository.findOne({
      where: { email: application.email },
    });

    if (existingUser) {
      // Update existing user to add organiser role
      if (
        existingUser.activeRole !== UserRole.ORGANISER &&
        existingUser.activeRole !== UserRole.ADMIN
      ) {
        await this.userRepository.update(existingUser.id, {
          activeRole: UserRole.ORGANISER,
          status: UserStatus.ACTIVE,
        });
      }
      user = {
        ...existingUser,
        activeRole: UserRole.ORGANISER,
        status: UserStatus.ACTIVE,
      };
    } else {
      // Create new user account
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = this.userRepository.create({
        id: uuidv4(),
        email: application.email,
        firstName: application.name.split(" ")[0],
        lastName: application.name.split(" ").slice(1).join(" ") || "",
        passwordHash: hashedPassword,
        activeRole: UserRole.ORGANISER,
        status: UserStatus.ACTIVE,
        isEmailVerified: false, // They'll need to verify their email
        metadata: {
          tempPassword, // Store temp password for email notification
          createdFromApplication: true,
          applicationId: application.id,
        },
      });

      user = await this.userRepository.save(newUser);
    }

    // Check if organiser profile already exists
    const existingOrganiser = await this.organiserRepository.findOne({
      where: { ownerId: user.id },
    });

    let organiser: Organiser;
    if (existingOrganiser) {
      organiser = existingOrganiser;
    } else {
      // Create organiser profile
      const newOrganiser = this.organiserRepository.create({
        id: uuidv4(),
        ownerId: user.id,
        name: application.organisation,
        description: `Event organiser for ${application.organisation}. ${application.eventDetails}`,
        metadata: {
          createdFromApplication: true,
          applicationId: application.id,
          contactEmail: application.email,
          contactPhone: application.phoneNumber,
        },
      });

      organiser = await this.organiserRepository.save(newOrganiser);
    }

    this.logger.log(
      `Created organiser account for ${application.email} (User: ${user.id}, Organiser: ${organiser.id})`,
    );
    return { user, organiser };
  }

  private generateTempPassword(): string {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private async notifyApprovedOrganiser(
    application: OrganiserApplication,
    user: User,
    organiser: Organiser,
  ): Promise<void> {
    try {
      const isNewUser = user.metadata?.createdFromApplication === true;
      const tempPassword = user.metadata?.tempPassword;

      let message = `Congratulations! Your organiser application for ${application.organisation} has been approved.`;

      if (isNewUser && tempPassword) {
        message += ` We've created your Tickit account with email: ${user.email}. Your temporary password is: ${tempPassword}. Please log in and change your password immediately.`;
      } else {
        message += ` You can now access organiser features using your existing Tickit account.`;
      }

      // Create notification
      await this.notificationsService.createNotification({
        userId: user.id,
        title: "Organiser Application Approved",
        message,
        type: NotificationType.SYSTEM_ALERT,
        metadata: {
          organiserId: organiser.id,
          applicationId: application.id,
          isNewAccount: isNewUser,
          link: "/organiser/dashboard",
        },
      });

      // Send real-time notification
      await this.realtimeNotificationService.notifyUser(user.id, {
        id: `organiser-approved-${application.id}-${Date.now()}`,
        type: NotificationPayloadType.SYSTEM_ALERT,
        title: "Organiser Application Approved",
        message,
        metadata: {
          organiserId: organiser.id,
          applicationId: application.id,
          isNewAccount: isNewUser,
          link: "/organiser/dashboard",
        },
        timestamp: new Date(),
      });

      this.logger.log(
        `Notified approved organiser: ${user.email} (Application: ${application.id})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to notify approved organiser: ${error.message}`,
      );
    }
  }
}
