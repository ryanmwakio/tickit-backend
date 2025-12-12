import { config } from 'dotenv';
import * as mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
config();

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const username = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'tixhub';

  try {
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host,
      port,
      user: username,
      password,
    });

    // Check if database exists
    const [databases] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [database],
    );

    if (databases.length === 0) {
      // Database doesn't exist, create it
      console.log(`Database '${database}' does not exist. Creating...`);
      await connection.execute(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database '${database}' created successfully`);
    } else {
      console.log(`✅ Database '${database}' already exists`);
    }

    await connection.end();
  } catch (error: any) {
    console.error(`Failed to initialize database: ${error.message}`);
    throw error;
  }
}

async function runMigrations() {
  console.log('\n📦 Running migrations...');
  try {
    const { stdout, stderr } = await execAsync('npm run migration:run', {
      cwd: process.cwd(),
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('✅ Migrations completed');
  } catch (error: any) {
    console.error(`Failed to run migrations: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

async function main() {
  try {
    await initDatabase();
    await runMigrations();
    console.log('\n✅ Database initialization and migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

