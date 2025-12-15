import { DataSource } from 'typeorm';
import { seedCategories } from './seeders/category.seeder';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runSeeders() {
  console.log('Starting database seeding...\n');

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'finance_budget_service',
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established\n');

    // Run seeders
    await seedCategories(dataSource);

    console.log('\n✅ All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\nDatabase connection closed');
  }
}

runSeeders();

