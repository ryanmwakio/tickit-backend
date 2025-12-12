# TypeORM Migrations Guide

This guide explains how to work with database migrations in the TixHub NestJS backend.

## Prerequisites

1. Ensure your `.env` file has the correct database configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=tixhub
   ```

2. Make sure your database exists:
   ```sql
   CREATE DATABASE IF NOT EXISTS tixhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

## Migration Commands

### 1. Generate a Migration

Generate a new migration file based on entity changes:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:generate -- src/migrations/CreateUsersTable
```

This will create a migration file like: `src/migrations/1234567890-CreateUsersTable.ts`

### 2. Create an Empty Migration

Create an empty migration file for custom SQL:

```bash
npm run migration:create -- src/migrations/MigrationName
```

**Example:**
```bash
npm run migration:create -- src/migrations/AddIndexToUsers
```

### 3. Run Migrations

Run all pending migrations:

```bash
npm run migration:run
```

This will execute all migrations that haven't been run yet, in order.

### 4. Revert Last Migration

Revert the most recently executed migration:

```bash
npm run migration:revert
```

### 5. Show Migration Status

Check which migrations have been run:

```bash
npm run migration:show
```

## Migration Workflow

### Initial Setup

1. **Generate initial migration from existing entities:**
   ```bash
   npm run migration:generate -- src/migrations/InitialSchema
   ```

2. **Review the generated migration file** in `src/migrations/`

3. **Run the migration:**
   ```bash
   npm run migration:run
   ```

### Making Schema Changes

1. **Modify your entity files** (e.g., `src/database/entities/*.entity.ts`)

2. **Generate a new migration:**
   ```bash
   npm run migration:generate -- src/migrations/AddNewColumnToUsers
   ```

3. **Review and edit the migration** if needed

4. **Run the migration:**
   ```bash
   npm run migration:run
   ```

### Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Run migrations before starting the app:**
   ```bash
   npm run migration:run
   ```

3. **Start the application:**
   ```bash
   npm run start:prod
   ```

## Migration File Structure

A typical migration file looks like this:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  name = 'CreateUsersTable1234567890'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
```

## Important Notes

1. **Never edit a migration that has already been run in production** - create a new migration instead
2. **Always test migrations in development** before running in production
3. **Backup your database** before running migrations in production
4. **Review generated migrations** - TypeORM's auto-generation is helpful but may need manual adjustments
5. **Use transactions** - TypeORM runs each migration in a transaction by default

## Troubleshooting

### Migration fails with "Table already exists"
- Check if the migration was partially run
- You may need to manually clean up and re-run

### "Cannot find module" errors
- Ensure you're running commands from the project root
- Check that `src/database/data-source.ts` exists

### Connection errors
- Verify your `.env` file has correct database credentials
- Ensure the database server is running
- Check network connectivity

## Auto-Run Migrations on Startup

If you want migrations to run automatically when the app starts, set in your database config:

```typescript
migrationsRun: true
```

**⚠️ Warning:** Only enable this in production if you're confident about your migration process.

