import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventIdToTickets1765131000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if eventId column exists
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tickets' 
      AND COLUMN_NAME = 'eventId'
    `);

    // Step 1: Add eventId column if it doesn't exist
    if (columns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`tickets\` 
        ADD COLUMN \`eventId\` char(36) NULL AFTER \`ticketTypeId\`
      `);
    }

    // Step 2: Backfill eventId for existing tickets by joining with ticket_types
    await queryRunner.query(`
      UPDATE \`tickets\` t
      INNER JOIN \`ticket_types\` tt ON t.\`ticketTypeId\` = tt.\`id\`
      SET t.\`eventId\` = tt.\`eventId\`
      WHERE t.\`eventId\` IS NULL
    `);

    // Step 2.5: Clean up any tickets with invalid eventIds (events that don't exist)
    // Delete tickets that reference non-existent events
    await queryRunner.query(`
      DELETE t FROM \`tickets\` t
      LEFT JOIN \`events\` e ON t.\`eventId\` = e.\`id\`
      WHERE t.\`eventId\` IS NOT NULL AND e.\`id\` IS NULL
    `);

    // Step 3: Make eventId NOT NULL (now that all rows have valid values)
    await queryRunner.query(`
      ALTER TABLE \`tickets\` 
      MODIFY COLUMN \`eventId\` char(36) NOT NULL
    `);

    // Step 4: Check if foreign key constraint exists
    const foreignKeys = await queryRunner.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tickets' 
      AND CONSTRAINT_NAME = 'FK_tickets_event'
    `);

    // Add foreign key constraint if it doesn't exist
    if (foreignKeys.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`tickets\` 
        ADD CONSTRAINT \`FK_tickets_event\` 
        FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) 
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    // Step 5: Check if index exists
    const indexes = await queryRunner.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tickets' 
      AND INDEX_NAME = 'IDX_tickets_eventId'
    `);

    // Add index for eventId if it doesn't exist
    if (indexes.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`IDX_tickets_eventId\` ON \`tickets\` (\`eventId\`)
      `);
    }

    // Step 6: Check if composite index exists
    const compositeIndexes = await queryRunner.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tickets' 
      AND INDEX_NAME = 'IDX_tickets_eventId_ownerId'
    `);

    // Add composite index for eventId and ownerId if it doesn't exist
    if (compositeIndexes.length === 0) {
      await queryRunner.query(`
        CREATE INDEX \`IDX_tickets_eventId_ownerId\` ON \`tickets\` (\`eventId\`, \`ownerId\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite index
    await queryRunner.query(`
      DROP INDEX \`IDX_tickets_eventId_ownerId\` ON \`tickets\`
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX \`IDX_tickets_eventId\` ON \`tickets\`
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE \`tickets\` 
      DROP FOREIGN KEY \`FK_tickets_event\`
    `);

    // Drop eventId column
    await queryRunner.query(`
      ALTER TABLE \`tickets\` 
      DROP COLUMN \`eventId\`
    `);
  }
}

