import { AppDataSource } from '../data-source';
import { seedUsers } from './seed-users';
import { seedEvents } from './seed-events';
import { seedTickets } from './seed-tickets';
import { seedCheapEvents } from './seed-cheap-events';

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Initialize data source
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established\n');
    }

    // Get command line arguments
    const args = process.argv.slice(2);
    const seedType = args[0];

    if (seedType === 'events') {
      // Seed events only
      await seedEvents(AppDataSource);
    } else if (seedType === 'cheap-events') {
      // Seed cheap events (KES 1.00) only
      await seedCheapEvents(AppDataSource);
    } else if (seedType === 'users') {
      // Seed users only
      await seedUsers(AppDataSource);
    } else if (seedType === 'tickets') {
      // Seed tickets only
      await seedTickets(AppDataSource);
    } else {
      // Seed all (default)
      await seedUsers(AppDataSource);
      console.log('\n');
      await seedEvents(AppDataSource);
      console.log('\n');
      await seedTickets(AppDataSource);
    }

    console.log('\n✅ Database seeding completed!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

runSeeds();

