import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { validateEnvironment } from './config/env.js';
import { User } from './models/User.js';

const bootstrapInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72),
}).strict();

async function run() {
  const config = validateEnvironment();
  const values = bootstrapInput.parse({
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  await connectDatabase(config.mongoUri);
  const existing = await User.findOne({ email: values.email.toLowerCase() });
  if (existing) throw new Error('An account with BOOTSTRAP_ADMIN_EMAIL already exists. Use the authenticated user-management API instead.');
  const user = await User.create({ ...values, email: values.email.toLowerCase(), role: 'admin', department: 'Administration' });
  console.info(JSON.stringify({ level: 'info', event: 'bootstrap_admin_created', userId: user.id, email: user.email }));
}

run()
  .catch((error) => { console.error(JSON.stringify({ level: 'error', event: 'bootstrap_admin_failed', message: error.message })); process.exitCode = 1; })
  .finally(async () => disconnectDatabase());
