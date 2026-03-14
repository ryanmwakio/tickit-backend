import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    const host = process.env.DB_HOST;
    const username = process.env.DB_USERNAME;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_DATABASE;
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (!host || !username || !password || !database) {
      throw new Error('Database configuration is incomplete. Please set DB_HOST, DB_USERNAME, DB_PASSWORD, and DB_DATABASE environment variables.');
    }

    // Always use migrations to avoid schema conflicts
    // Set DB_USE_MIGRATIONS=false to enable synchronize (not recommended)
    // Default to true (use migrations) to prevent schema conflicts
    const useMigrations = process.env.DB_USE_MIGRATIONS !== 'false';
    // Disable synchronize by default - use migrations instead
    // Only enable synchronize if explicitly requested (DB_USE_MIGRATIONS=false)
    const synchronize = false; // Always false - use migrations instead

    return {
      type: 'mysql',
      host,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username,
      password,
      database,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
      synchronize, // Auto-create/update tables in development
      migrationsRun: useMigrations, // Auto-run migrations if enabled
      logging: process.env.NODE_ENV === 'development',
      charset: 'utf8mb4',
      timezone: '+00:00',
      extra: {
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 30000,
      },
    };
  },
);

