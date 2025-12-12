import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Drop all tables in the database
 * Use with caution - this will delete all data!
 */
export async function dropAllTables(dataSource: DataSource): Promise<void> {
  const logger = new Logger('DropTables');
  
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Get all table names
    const tables = await queryRunner.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `);
    
    if (tables.length === 0) {
      logger.log('No tables to drop');
      await queryRunner.release();
      return;
    }
    
    // Disable foreign key checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop all tables
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      logger.log(`Dropping table: ${tableName}`);
      await queryRunner.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    
    // Re-enable foreign key checks
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    
    await queryRunner.release();
    logger.log('✅ All tables dropped successfully');
  } catch (error: any) {
    logger.error(`Error dropping tables: ${error.message}`);
    throw error;
  }
}

