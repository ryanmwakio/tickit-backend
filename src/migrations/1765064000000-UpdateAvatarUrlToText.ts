import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAvatarUrlToText1765064000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change avatarUrl column from VARCHAR(255) to TEXT to support base64 data URLs
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`avatarUrl\` TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to VARCHAR(255)
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`avatarUrl\` VARCHAR(255) NULL
    `);
  }
}

