import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketDesignAndSeatMap1767341608000 implements MigrationInterface {
    name = 'AddTicketDesignAndSeatMap1767341608000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if tables exist
        const ticketDesignsExists = await queryRunner.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_designs'`
        );
        
        const seatMapsExists = await queryRunner.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seat_maps'`
        );
        
        const seatsExists = await queryRunner.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seats'`
        );

        // Create ticket_designs table if it doesn't exist
        if (ticketDesignsExists.length === 0) {
            await queryRunner.query(`
            CREATE TABLE \`ticket_designs\` (
                \`id\` char(36) NOT NULL,
                \`organiserId\` char(36) NOT NULL,
                \`eventId\` char(36) NULL,
                \`name\` varchar(200) NOT NULL,
                \`description\` text NULL,
                \`designConfig\` json NOT NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`isDefault\` tinyint NOT NULL DEFAULT 0,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_ticket_designs_organiser\` (\`organiserId\`),
                INDEX \`IDX_ticket_designs_event\` (\`eventId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        }

        // Create seat_maps table if it doesn't exist
        if (seatMapsExists.length === 0) {
            await queryRunner.query(`
            CREATE TABLE \`seat_maps\` (
                \`id\` char(36) NOT NULL,
                \`organiserId\` char(36) NOT NULL,
                \`eventId\` char(36) NOT NULL,
                \`name\` varchar(200) NOT NULL,
                \`description\` text NULL,
                \`mapConfig\` json NOT NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_seat_maps_organiser\` (\`organiserId\`),
                INDEX \`IDX_seat_maps_event\` (\`eventId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        }

        // Create seats table if it doesn't exist
        if (seatsExists.length === 0) {
            await queryRunner.query(`
            CREATE TABLE \`seats\` (
                \`id\` char(36) NOT NULL,
                \`seatMapId\` char(36) NOT NULL,
                \`section\` varchar(100) NOT NULL,
                \`row\` varchar(50) NULL,
                \`number\` varchar(50) NOT NULL,
                \`positionX\` decimal(10,2) NOT NULL,
                \`positionY\` decimal(10,2) NOT NULL,
                \`priceCents\` bigint NULL,
                \`currency\` varchar(10) NOT NULL DEFAULT 'KES',
                \`type\` enum('standard', 'vip', 'accessible', 'premium', 'restricted') NOT NULL DEFAULT 'standard',
                \`status\` enum('AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED', 'DISABLED') NOT NULL DEFAULT 'AVAILABLE',
                \`ticketId\` char(36) NULL,
                \`reservedBy\` char(36) NULL,
                \`reservedUntil\` datetime NULL,
                \`metadata\` json NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_seats_seat_map\` (\`seatMapId\`),
                INDEX \`IDX_seats_section_row_number\` (\`seatMapId\`, \`section\`, \`row\`, \`number\`),
                INDEX \`IDX_seats_status\` (\`status\`),
                INDEX \`IDX_seats_ticket\` (\`ticketId\`),
                UNIQUE INDEX \`IDX_seats_ticket_unique\` (\`ticketId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        }

        // Check if columns exist in events table
        const eventsColumns = await queryRunner.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' 
             AND COLUMN_NAME IN ('ticketDesignId', 'seatMapId')`
        ) as any[];
        const columnNames = eventsColumns.map((c: any) => c.COLUMN_NAME || c.column_name);
        const hasTicketDesignId = columnNames.includes('ticketDesignId');
        const hasSeatMapId = columnNames.includes('seatMapId');

        // Add ticket design and seat map columns to events table if they don't exist
        if (!hasTicketDesignId || !hasSeatMapId) {
            const alterStatements: string[] = [];
            if (!hasTicketDesignId) alterStatements.push('ADD COLUMN `ticketDesignId` char(36) NULL');
            if (!hasSeatMapId) alterStatements.push('ADD COLUMN `seatMapId` char(36) NULL');
            if (alterStatements.length > 0) {
                try {
                    await queryRunner.query(`
                        ALTER TABLE \`events\` 
                        ${alterStatements.join(', ')}
                    `);
                } catch (error: any) {
                    // Column might already exist, continue
                    if (error.code !== 'ER_DUP_FIELDNAME') {
                        throw error;
                    }
                }
            }
        }

        // Check if columns exist in tickets table
        const ticketsColumns = await queryRunner.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' 
             AND COLUMN_NAME IN ('seatId', 'seatSection', 'seatRow', 'seatNumber')`
        ) as any[];
        const ticketColumnNames = ticketsColumns.map((c: any) => c.COLUMN_NAME || c.column_name);
        const hasSeatId = ticketColumnNames.includes('seatId');
        const hasSeatSection = ticketColumnNames.includes('seatSection');
        const hasSeatRow = ticketColumnNames.includes('seatRow');
        const hasSeatNumber = ticketColumnNames.includes('seatNumber');

        // Add seat information columns to tickets table if they don't exist
        if (!hasSeatId || !hasSeatSection || !hasSeatRow || !hasSeatNumber) {
            const alterStatements: string[] = [];
            if (!hasSeatId) alterStatements.push('ADD COLUMN `seatId` char(36) NULL');
            if (!hasSeatSection) alterStatements.push('ADD COLUMN `seatSection` varchar(100) NULL');
            if (!hasSeatRow) alterStatements.push('ADD COLUMN `seatRow` varchar(50) NULL');
            if (!hasSeatNumber) alterStatements.push('ADD COLUMN `seatNumber` varchar(50) NULL');
            if (alterStatements.length > 0) {
                try {
                    await queryRunner.query(`
                        ALTER TABLE \`tickets\` 
                        ${alterStatements.join(', ')}
                    `);
                } catch (error: any) {
                    // Column might already exist, continue
                    if (error.code !== 'ER_DUP_FIELDNAME') {
                        throw error;
                    }
                }
            }
        }

        // Skip foreign key creation if tables already existed - let fix migration handle it
        const tablesExisted = ticketDesignsExists.length > 0 || seatMapsExists.length > 0 || seatsExists.length > 0;
        
        if (tablesExisted) {
            // Tables already exist, skip foreign key creation - fix migration will handle it
            return;
        }

        // Get existing foreign keys to avoid duplicates
        const existingFks = await queryRunner.query(
            `SELECT CONSTRAINT_NAME, TABLE_NAME 
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME IN ('ticket_designs', 'seat_maps', 'seats', 'events')
             AND REFERENCED_TABLE_NAME IS NOT NULL`
        ) as any[];
        const fkNameSet = new Set(existingFks.map((fk: any) => fk.CONSTRAINT_NAME || fk.constraint_name));

        // Add foreign key constraints if they don't exist
        if (!fkNameSet.has('FK_ticket_designs_organiser')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`ticket_designs\` 
                ADD CONSTRAINT \`FK_ticket_designs_organiser\` 
                FOREIGN KEY (\`organiserId\`) REFERENCES \`organisers\`(\`id\`) 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_ticket_designs_event')) {
            await queryRunner.query(`
            ALTER TABLE \`ticket_designs\` 
            ADD CONSTRAINT \`FK_ticket_designs_event\` 
            FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        }

        if (!fkNameSet.has('FK_seat_maps_organiser')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`seat_maps\` 
                ADD CONSTRAINT \`FK_seat_maps_organiser\` 
                FOREIGN KEY (\`organiserId\`) REFERENCES \`organisers\`(\`id\`) 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_seat_maps_event')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`seat_maps\` 
                ADD CONSTRAINT \`FK_seat_maps_event\` 
                FOREIGN KEY (\`eventId\`) REFERENCES \`events\`(\`id\`) 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_seats_seat_map')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`seats\` 
                ADD CONSTRAINT \`FK_seats_seat_map\` 
                FOREIGN KEY (\`seatMapId\`) REFERENCES \`seat_maps\`(\`id\`) 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_seats_ticket')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`seats\` 
                ADD CONSTRAINT \`FK_seats_ticket\` 
                FOREIGN KEY (\`ticketId\`) REFERENCES \`tickets\`(\`id\`) 
                ON DELETE SET NULL ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_events_ticket_design')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`events\` 
                ADD CONSTRAINT \`FK_events_ticket_design\` 
                FOREIGN KEY (\`ticketDesignId\`) REFERENCES \`ticket_designs\`(\`id\`) 
                ON DELETE SET NULL ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }

        if (!fkNameSet.has('FK_events_seat_map')) {
            try {
                await queryRunner.query(`
                ALTER TABLE \`events\` 
                ADD CONSTRAINT \`FK_events_seat_map\` 
                FOREIGN KEY (\`seatMapId\`) REFERENCES \`seat_maps\`(\`id\`) 
                ON DELETE SET NULL ON UPDATE NO ACTION
            `);
            } catch (error: any) {
                if (error.code !== 'ER_DUP_KEY_NAME' && error.code !== 'ER_FK_INCOMPATIBLE_COLUMNS' && error.errno !== 3780 && !error.message.includes('incompatible')) {
                    throw error;
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE \`events\` DROP FOREIGN KEY \`FK_events_seat_map\``);
        await queryRunner.query(`ALTER TABLE \`events\` DROP FOREIGN KEY \`FK_events_ticket_design\``);
        await queryRunner.query(`ALTER TABLE \`seats\` DROP FOREIGN KEY \`FK_seats_ticket\``);
        await queryRunner.query(`ALTER TABLE \`seats\` DROP FOREIGN KEY \`FK_seats_seat_map\``);
        await queryRunner.query(`ALTER TABLE \`seat_maps\` DROP FOREIGN KEY \`FK_seat_maps_event\``);
        await queryRunner.query(`ALTER TABLE \`seat_maps\` DROP FOREIGN KEY \`FK_seat_maps_organiser\``);
        await queryRunner.query(`ALTER TABLE \`ticket_designs\` DROP FOREIGN KEY \`FK_ticket_designs_event\``);
        await queryRunner.query(`ALTER TABLE \`ticket_designs\` DROP FOREIGN KEY \`FK_ticket_designs_organiser\``);

        // Drop columns from tickets table
        await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`seatNumber\``);
        await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`seatRow\``);
        await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`seatSection\``);
        await queryRunner.query(`ALTER TABLE \`tickets\` DROP COLUMN \`seatId\``);

        // Drop columns from events table
        await queryRunner.query(`ALTER TABLE \`events\` DROP COLUMN \`seatMapId\``);
        await queryRunner.query(`ALTER TABLE \`events\` DROP COLUMN \`ticketDesignId\``);

        // Drop tables
        await queryRunner.query(`DROP TABLE \`seats\``);
        await queryRunner.query(`DROP TABLE \`seat_maps\``);
        await queryRunner.query(`DROP TABLE \`ticket_designs\``);
    }
}

