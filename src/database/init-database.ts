import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

/**
 * Initialize database - creates database if it doesn't exist
 * This runs before TypeORM connection
 */
export async function initDatabase(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}): Promise<void> {
  const logger = new Logger('DatabaseInit');

  try {
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
    });

    // Check if database exists
    const [databases] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [config.database],
    );

    if (databases.length === 0) {
      // Database doesn't exist, create it
      logger.log(`Database '${config.database}' does not exist. Creating...`);
      await connection.execute(`CREATE DATABASE \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      logger.log(`✅ Database '${config.database}' created successfully`);
    } else {
      logger.log(`✅ Database '${config.database}' already exists`);
    }

    await connection.end();
  } catch (error: any) {
    logger.error(`Failed to initialize database: ${error.message}`);
    throw error;
  }
}

