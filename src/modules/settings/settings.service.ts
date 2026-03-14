import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceSettings } from '../../database/entities/workspace-settings.entity';
import { v4 as uuidv4 } from 'uuid';

export interface SettingValue {
  [key: string]: any;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(WorkspaceSettings)
    private settingsRepository: Repository<WorkspaceSettings>,
  ) {}

  async getAllSettings(userId: string, organiserId?: string): Promise<Record<string, any>> {
    const where: any = { userId };
    if (organiserId) {
      where.organiserId = organiserId;
    }

    const settings = await this.settingsRepository.find({
      where,
    });

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  async getSetting(userId: string, key: string, organiserId?: string): Promise<any> {
    const where: any = { userId, key };
    if (organiserId) {
      where.organiserId = organiserId;
    }

    const setting = await this.settingsRepository.findOne({ where });
    return setting?.value ?? null;
  }

  async setSetting(
    userId: string,
    key: string,
    value: any,
    organiserId?: string,
  ): Promise<WorkspaceSettings> {
    const where: any = { userId, key };
    if (organiserId) {
      where.organiserId = organiserId;
    }

    let setting = await this.settingsRepository.findOne({ where });

    if (setting) {
      setting.value = value;
      return this.settingsRepository.save(setting);
    } else {
      setting = this.settingsRepository.create({
        id: uuidv4(),
        userId,
        organiserId,
        key,
        value,
      });
      return this.settingsRepository.save(setting);
    }
  }

  async setMultipleSettings(
    userId: string,
    settings: Record<string, any>,
    organiserId?: string,
  ): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.setSetting(userId, key, value, organiserId);
    }
  }

  async deleteSetting(userId: string, key: string, organiserId?: string): Promise<void> {
    const where: any = { userId, key };
    if (organiserId) {
      where.organiserId = organiserId;
    }

    await this.settingsRepository.delete(where);
  }

  async getDefaultSettings(): Promise<Record<string, any>> {
    // Default settings values
    return {
      // Security & Authentication
      twoFactorAuth: true,
      lockResaleKenya: true,
      sessionTimeout: false,
      loginAlerts: true,
      passwordPolicy: true,

      // Automation & Operations
      autoPauseOnIncident: true,
      autoRefundPolicy: false,
      autoArchiveEvents: true,
      incidentNotifications: true,

      // Payments & Payouts
      enableMpesa: true,
      enableCardPayments: true,
      enableEscrow: false,
      autoPayouts: true,
      payoutNotifications: true,

      // Integrations & APIs
      enablePartnerAPIs: false,
      webhookRetries: true,
      apiRateLimiting: true,
      thirdPartyTracking: false,

      // Audit & Compliance
      auditLogging: true,
      weeklyAuditReports: true,
      dataRetention: false,
      complianceMode: false,

      // Notifications & Communications
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: false,
    };
  }
}

