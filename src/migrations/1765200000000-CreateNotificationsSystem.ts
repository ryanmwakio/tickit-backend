import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsSystem1765200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_preferences\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`email_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`sms_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`in_app_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`push_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`payment_updates\` tinyint(1) NOT NULL DEFAULT 1,
        \`event_changes\` tinyint(1) NOT NULL DEFAULT 1,
        \`organizer_messages\` tinyint(1) NOT NULL DEFAULT 1,
        \`system_notifications\` tinyint(1) NOT NULL DEFAULT 1,
        \`promo_allowed\` tinyint(1) NOT NULL DEFAULT 1,
        \`ticket_reminders\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_notification_preferences_user_id\` (\`user_id\`),
        CONSTRAINT \`FK_notification_preferences_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`message\` text NOT NULL,
        \`type\` enum(
          'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED', 'TICKET_DELIVERED', 'REFUND_PROCESSED',
          'EVENT_DATE_CHANGE', 'EVENT_VENUE_CHANGE', 'EVENT_TIME_CHANGE', 'EVENT_CANCELLED',
          'ORGANIZER_MESSAGE', 'ORGANIZER_ANNOUNCEMENT',
          'LOGIN_ALERT', 'ACCOUNT_CHANGED', 'SUBSCRIPTION_UPDATE',
          'NEW_EVENTS_SUGGESTED', 'EARLY_BIRD_TICKETS', 'DISCOUNT_AVAILABLE', 'TRENDING_EVENTS',
          'EVENT_PENDING_APPROVAL', 'EVENT_APPROVED', 'EVENT_REJECTED',
          'EVENT_GOING_LIVE', 'EVENT_LIVE_STARTED', 'EVENT_LIVE_ENDED',
          'TICKET_CREATED', 'TICKET_SOLD', 'TICKET_TRANSFERRED',
          'ORDER_CREATED', 'ORDER_PAID', 'ORDER_REFUNDED',
          'PAYMENT_PENDING', 'PAYMENT_COMPLETED',
          'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_REJECTED',
          'SYSTEM_ALERT', 'MAINTENANCE'
        ) NOT NULL,
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`metadata\` json DEFAULT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_notifications_user_id_is_read\` (\`user_id\`, \`is_read\`),
        KEY \`IDX_notifications_user_id_created_at\` (\`user_id\`, \`created_at\`),
        KEY \`IDX_notifications_type\` (\`type\`),
        CONSTRAINT \`FK_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`notification_preferences\``);
  }
}

