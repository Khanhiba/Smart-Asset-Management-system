import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { seedDemoData } from './seed.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  console.warn('JWT_SECRET is not configured. Using an ephemeral secret in demo fallback mode.');
}

async function start() {
  try {
    await connectDatabase(process.env.MONGODB_URI);
    if (process.env.SEED_DEMO_DATA !== 'false') await seedDemoData();
  } catch (error) {
    process.env.DEMO_FALLBACK = 'true';
    console.warn(`Database connection failed. Starting in demo fallback mode: ${error.message}`);
  }
  app.listen(port, () => console.info(`Nexus API listening on http://localhost:${port}`));
}

start();
