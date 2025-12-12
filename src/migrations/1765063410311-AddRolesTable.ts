import { MigrationInterface, QueryRunner } from "typeorm";
import { v4 as uuidv4 } from 'uuid';

export class AddRolesTable1765063410311 implements MigrationInterface {
    name = 'AddRolesTable1765063410311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create roles table
        await queryRunner.query(`CREATE TABLE \`roles\` (\`id\` char(36) NOT NULL, \`name\` varchar(50) NOT NULL, \`description\` varchar(255) NULL, \`permissions\` json NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        
        // Create user_roles junction table
        await queryRunner.query(`CREATE TABLE \`user_roles\` (\`userId\` char(36) NOT NULL, \`roleId\` char(36) NOT NULL, INDEX \`IDX_472b25323af01488f1f66a06b6\` (\`userId\`), INDEX \`IDX_86033897c009fcca8b6505d6be\` (\`roleId\`), PRIMARY KEY (\`userId\`, \`roleId\`)) ENGINE=InnoDB`);
        
        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE \`user_roles\` ADD CONSTRAINT \`FK_472b25323af01488f1f66a06b67\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`user_roles\` ADD CONSTRAINT \`FK_86033897c009fcca8b6505d6be2\` FOREIGN KEY (\`roleId\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // Seed initial roles
        const roles = [
            { id: uuidv4(), name: 'ATTENDEE', description: 'Default role for event attendees' },
            { id: uuidv4(), name: 'ORGANISER', description: 'Role for event organisers' },
            { id: uuidv4(), name: 'PROMOTER', description: 'Role for event promoters' },
            { id: uuidv4(), name: 'STAFF', description: 'Role for event staff members' },
            { id: uuidv4(), name: 'ADMIN', description: 'Administrator role with full access' },
        ];

        for (const role of roles) {
            await queryRunner.query(
                `INSERT INTO \`roles\` (\`id\`, \`name\`, \`description\`, \`isActive\`) VALUES (?, ?, ?, 1)`,
                [role.id, role.name, role.description]
            );
        }

        // Migrate existing roles from comma-separated string to user_roles table
        // Get all users with roles
        const usersWithRoles: Array<{ id: string; roles: string; activeRole?: string }> = await queryRunner.query(
            `SELECT \`id\`, \`roles\`, \`activeRole\` FROM \`users\` WHERE \`roles\` IS NOT NULL AND \`roles\` != ''`
        );

        // Create a map of role names to role IDs
        const roleMap: Record<string, string> = {};
        const roleRows: Array<{ id: string; name: string }> = await queryRunner.query(`SELECT \`id\`, \`name\` FROM \`roles\``);
        for (const row of roleRows) {
            roleMap[row.name] = row.id;
        }

        // Migrate each user's roles
        for (const user of usersWithRoles) {
            if (user.roles) {
                const roleNames = user.roles.split(',').map((r: string) => r.trim()).filter((r: string) => r);
                
                for (const roleName of roleNames) {
                    const roleId = roleMap[roleName.toUpperCase()];
                    if (roleId) {
                        // Insert into user_roles if not already exists
                        await queryRunner.query(
                            `INSERT IGNORE INTO \`user_roles\` (\`userId\`, \`roleId\`) VALUES (?, ?)`,
                            [user.id, roleId]
                        );
                    }
                }
            }
            
            // Also add activeRole if it exists
            if (user.activeRole) {
                const activeRoleId = roleMap[user.activeRole];
                if (activeRoleId) {
                    await queryRunner.query(
                        `INSERT IGNORE INTO \`user_roles\` (\`userId\`, \`roleId\`) VALUES (?, ?)`,
                        [user.id, activeRoleId]
                    );
                }
            }
        }

        // For users without roles, assign ATTENDEE role by default
        const usersWithoutRoles = await queryRunner.query(
            `SELECT \`id\` FROM \`users\` WHERE \`id\` NOT IN (SELECT DISTINCT \`userId\` FROM \`user_roles\`)`
        );
        
        const attendeeRoleId = roleMap['ATTENDEE'];
        if (attendeeRoleId) {
            for (const user of usersWithoutRoles) {
                await queryRunner.query(
                    `INSERT INTO \`user_roles\` (\`userId\`, \`roleId\`) VALUES (?, ?)`,
                    [user.id, attendeeRoleId]
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_86033897c009fcca8b6505d6be2\``);
        await queryRunner.query(`ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_472b25323af01488f1f66a06b67\``);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX \`IDX_86033897c009fcca8b6505d6be\` ON \`user_roles\``);
        await queryRunner.query(`DROP INDEX \`IDX_472b25323af01488f1f66a06b6\` ON \`user_roles\``);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE \`user_roles\``);
        await queryRunner.query(`DROP INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` ON \`roles\``);
        await queryRunner.query(`DROP TABLE \`roles\``);
    }

}
