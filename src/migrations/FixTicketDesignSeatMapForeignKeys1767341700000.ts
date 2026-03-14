import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTicketDesignSeatMapForeignKeys1767341700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all foreign keys for ticket_designs and seat_maps
    const ticketDesignFks = await queryRunner.query(
      `SELECT CONSTRAINT_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'ticket_designs' 
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );

    const seatMapFks = await queryRunner.query(
      `SELECT CONSTRAINT_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'seat_maps' 
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );

    // Drop existing foreign keys
    for (const fk of ticketDesignFks) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`ticket_designs\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
        );
      } catch (error) {
        // Continue if FK doesn't exist
      }
    }

    for (const fk of seatMapFks) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`seat_maps\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
        );
      } catch (error) {
        // Continue if FK doesn't exist
      }
    }

    // Ensure column types match exactly (including character set and collation)
    // Make sure organiserId and eventId are char(36) to match organisers.id and events.id
    try {
      await queryRunner.query(
        `ALTER TABLE \`ticket_designs\` 
         MODIFY COLUMN \`organiserId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
         MODIFY COLUMN \`eventId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL`,
      );
    } catch (error: any) {
      // Column might already be correct, continue
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Warning modifying ticket_designs columns:', error.message);
      }
    }

    try {
      await queryRunner.query(
        `ALTER TABLE \`seat_maps\` 
         MODIFY COLUMN \`organiserId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
         MODIFY COLUMN \`eventId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL`,
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.warn('Warning modifying seat_maps columns:', error.message);
      }
    }

    // Recreate foreign keys with correct types
    try {
      await queryRunner.query(
        `ALTER TABLE \`ticket_designs\` 
         ADD CONSTRAINT \`FK_ticket_designs_organiser\` 
         FOREIGN KEY (\`organiserId\`) 
         REFERENCES \`organisers\`(\`id\`) 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780) {
        console.warn('Warning creating FK_ticket_designs_organiser:', error.message);
      }
    }

    try {
      await queryRunner.query(
        `ALTER TABLE \`ticket_designs\` 
         ADD CONSTRAINT \`FK_ticket_designs_event\` 
         FOREIGN KEY (\`eventId\`) 
         REFERENCES \`events\`(\`id\`) 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780) {
        console.warn('Warning creating FK_ticket_designs_event:', error.message);
      }
    }

    try {
      await queryRunner.query(
        `ALTER TABLE \`seat_maps\` 
         ADD CONSTRAINT \`FK_seat_maps_organiser\` 
         FOREIGN KEY (\`organiserId\`) 
         REFERENCES \`organisers\`(\`id\`) 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780) {
        console.warn('Warning creating FK_seat_maps_organiser:', error.message);
      }
    }

    try {
      await queryRunner.query(
        `ALTER TABLE \`seat_maps\` 
         ADD CONSTRAINT \`FK_seat_maps_event\` 
         FOREIGN KEY (\`eventId\`) 
         REFERENCES \`events\`(\`id\`) 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780) {
        console.warn('Warning creating FK_seat_maps_event:', error.message);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE \`ticket_designs\` DROP FOREIGN KEY IF EXISTS \`FK_ticket_designs_organiser\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`ticket_designs\` DROP FOREIGN KEY IF EXISTS \`FK_ticket_designs_event\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`seat_maps\` DROP FOREIGN KEY IF EXISTS \`FK_seat_maps_organiser\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`seat_maps\` DROP FOREIGN KEY IF EXISTS \`FK_seat_maps_event\``,
    );
  }
}

