import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeOrderBuyerIdNullable1765126187284 implements MigrationInterface {
    name = 'MakeOrderBuyerIdNullable1765126187284'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make buyerId nullable to support guest checkout
        await queryRunner.query(`ALTER TABLE \`orders\` MODIFY \`buyerId\` char(36) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert buyerId to NOT NULL (note: this may fail if there are NULL values)
        await queryRunner.query(`ALTER TABLE \`orders\` MODIFY \`buyerId\` char(36) NOT NULL`);
    }

}
