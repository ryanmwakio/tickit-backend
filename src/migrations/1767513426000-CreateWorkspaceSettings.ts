import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkspaceSettings1767513426000 implements MigrationInterface {
    name = 'CreateWorkspaceSettings1767513426000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const tableExists = await queryRunner.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspace_settings'`
        ) as Array<{ TABLE_NAME: string }>;

        // Create table if it doesn't exist
        if (tableExists.length === 0) {
            await queryRunner.query(`
                CREATE TABLE \`workspace_settings\` (
                    \`id\` char(36) NOT NULL,
                    \`userId\` char(36) NOT NULL,
                    \`organiserId\` char(36) NULL,
                    \`key\` varchar(100) NOT NULL,
                    \`value\` json NULL,
                    \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    INDEX \`IDX_workspace_settings_user\` (\`userId\`),
                    INDEX \`IDX_workspace_settings_organiser\` (\`organiserId\`),
                    UNIQUE INDEX \`IDX_workspace_settings_user_key\` (\`userId\`, \`key\`),
                    PRIMARY KEY (\`id\`)
                ) ENGINE=InnoDB
            `);

            // Check if foreign keys exist before adding them
            const fkUserExists = await queryRunner.query(`
                SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'workspace_settings' 
                AND CONSTRAINT_NAME = 'FK_workspace_settings_user'
            `) as Array<{ CONSTRAINT_NAME: string }>;

            if (fkUserExists.length === 0) {
                await queryRunner.query(`
                    ALTER TABLE \`workspace_settings\`
                    ADD CONSTRAINT \`FK_workspace_settings_user\`
                    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
                `);
            }

            const fkOrganiserExists = await queryRunner.query(`
                SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'workspace_settings' 
                AND CONSTRAINT_NAME = 'FK_workspace_settings_organiser'
            `) as Array<{ CONSTRAINT_NAME: string }>;

            if (fkOrganiserExists.length === 0) {
                await queryRunner.query(`
                    ALTER TABLE \`workspace_settings\`
                    ADD CONSTRAINT \`FK_workspace_settings_organiser\`
                    FOREIGN KEY (\`organiserId\`) REFERENCES \`organisers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`workspace_settings\` DROP FOREIGN KEY \`FK_workspace_settings_organiser\``);
        await queryRunner.query(`ALTER TABLE \`workspace_settings\` DROP FOREIGN KEY \`FK_workspace_settings_user\``);
        await queryRunner.query(`DROP INDEX \`IDX_workspace_settings_user_key\` ON \`workspace_settings\``);
        await queryRunner.query(`DROP INDEX \`IDX_workspace_settings_organiser\` ON \`workspace_settings\``);
        await queryRunner.query(`DROP INDEX \`IDX_workspace_settings_user\` ON \`workspace_settings\``);
        await queryRunner.query(`DROP TABLE \`workspace_settings\``);
    }
}

