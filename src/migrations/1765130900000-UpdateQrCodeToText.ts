import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateQrCodeToText1765130900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the index on qrCode first (TEXT columns can't be indexed without key length)
    await queryRunner.query(`
      DROP INDEX \`IDX_fededfa934cf8d7214adfa6c82\` ON \`tickets\`
    `);

    // Change qrCode column from VARCHAR(500) to TEXT to support base64 data URLs
    await queryRunner.query(`
      ALTER TABLE \`tickets\` 
      MODIFY COLUMN \`qrCode\` TEXT NOT NULL
    `);

    // Recreate index with a key length (first 255 characters for searching)
    await queryRunner.query(`
      CREATE INDEX \`IDX_fededfa934cf8d7214adfa6c82\` ON \`tickets\` (\`qrCode\`(255))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX \`IDX_fededfa934cf8d7214adfa6c82\` ON \`tickets\`
    `);

    // Revert back to VARCHAR(500)
    await queryRunner.query(`
      ALTER TABLE \`tickets\` 
      MODIFY COLUMN \`qrCode\` VARCHAR(500) NOT NULL
    `);

    // Recreate the original index
    await queryRunner.query(`
      CREATE INDEX \`IDX_fededfa934cf8d7214adfa6c82\` ON \`tickets\` (\`qrCode\`)
    `);
  }
}

