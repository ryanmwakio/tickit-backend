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

    // In development, use synchronize to auto-create tables
    // In production, use migrations (set DB_USE_MIGRATIONS=true to force migrations in dev)
    const useMigrations = process.env.DB_USE_MIGRATIONS === 'true' || nodeEnv === 'production';
    // Synchronize will auto-create/update tables in development
    // If tables already exist with different schema, you may need to drop them first
    // Set DB_DROP_SCHEMA=true to drop all tables before creating (WARNING: deletes all data!)
    const synchronize = !useMigrations && nodeEnv === 'development';

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

