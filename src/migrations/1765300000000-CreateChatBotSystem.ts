import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatBotSystem1765300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create chat_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_sessions\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NULL,
        \`guest_id\` varchar(100) NULL,
        \`guest_name\` varchar(100) NULL,
        \`guest_email\` varchar(255) NULL,
        \`status\` enum('ACTIVE', 'RESOLVED', 'ESCALATED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
        \`assigned_to_id\` char(36) NULL,
        \`metadata\` json DEFAULT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_chat_sessions_user_id\` (\`user_id\`),
        KEY \`IDX_chat_sessions_status\` (\`status\`),
        KEY \`IDX_chat_sessions_created_at\` (\`created_at\`),
        CONSTRAINT \`FK_chat_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_chat_sessions_assigned_to\` FOREIGN KEY (\`assigned_to_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` char(36) NOT NULL,
        \`session_id\` char(36) NOT NULL,
        \`sender_type\` enum('USER', 'BOT', 'AGENT') NOT NULL,
        \`user_id\` char(36) NULL,
        \`message\` text NOT NULL,
        \`metadata\` json DEFAULT NULL,
        \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_chat_messages_session_id\` (\`session_id\`),
        KEY \`IDX_chat_messages_session_created\` (\`session_id\`, \`created_at\`),
        KEY \`IDX_chat_messages_sender_type\` (\`sender_type\`),
        CONSTRAINT \`FK_chat_messages_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`chat_sessions\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_chat_messages_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`chat_messages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`chat_sessions\``);
  }
}

