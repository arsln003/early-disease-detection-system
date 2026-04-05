// src/database/seeds/seed.ts
import * as dotenv from 'dotenv';
dotenv.config(); // ← must be first line before any imports

import { DataSource } from 'typeorm';
import { Admin } from 'src/entities/entities/Admin';
import { seedAdmins } from './admin.seed';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,   // ✅ same as app.module.ts
  ssl: { rejectUnauthorized: false },
  entities: [Admin],
  synchronize: false,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('🔌 Database connected');
    await seedAdmins(dataSource);
    console.log('🌱 Seeding complete');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

runSeed();