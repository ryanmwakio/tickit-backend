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

    // Ensure column types match exactly
    // Make sure organiserId and eventId are char(36) to match organisers.id and events.id
    await queryRunner.query(
      `ALTER TABLE \`ticket_designs\` 
       MODIFY COLUMN \`organiserId\` char(36) NOT NULL,
       MODIFY COLUMN \`eventId\` char(36) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE \`seat_maps\` 
       MODIFY COLUMN \`organiserId\` char(36) NOT NULL,
       MODIFY COLUMN \`eventId\` char(36) NOT NULL`,
    );

    // Recreate foreign keys with correct types
    await queryRunner.query(
      `ALTER TABLE \`ticket_designs\` 
       ADD CONSTRAINT \`FK_ticket_designs_organiser\` 
       FOREIGN KEY (\`organiserId\`) 
       REFERENCES \`organisers\`(\`id\`) 
       ON DELETE CASCADE 
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`ticket_designs\` 
       ADD CONSTRAINT \`FK_ticket_designs_event\` 
       FOREIGN KEY (\`eventId\`) 
       REFERENCES \`events\`(\`id\`) 
       ON DELETE CASCADE 
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`seat_maps\` 
       ADD CONSTRAINT \`FK_seat_maps_organiser\` 
       FOREIGN KEY (\`organiserId\`) 
       REFERENCES \`organisers\`(\`id\`) 
       ON DELETE CASCADE 
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`seat_maps\` 
       ADD CONSTRAINT \`FK_seat_maps_event\` 
       FOREIGN KEY (\`eventId\`) 
       REFERENCES \`events\`(\`id\`) 
       ON DELETE CASCADE 
       ON UPDATE NO ACTION`,
    );
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

