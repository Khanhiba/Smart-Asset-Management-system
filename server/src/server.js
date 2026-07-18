import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { runtime, validateEnvironment } from './config/env.js';
import { seedDemoData } from './seed.js';

async function start() {
  const config = validateEnvironment();
  await connectDatabase(config.mongoUri);
  if (config.seedDemoData) await seedDemoData();
  const server = app.listen(config.port, () => console.info(JSON.stringify({ level: 'info', event: 'api_listening', port: config.port, environment: runtime.environment })));
  const shutdown = async (signal) => {
    console.info(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
    server.close(async () => {
      await disconnectDatabase();
      console.info(JSON.stringify({ level: 'info', event: 'shutdown_complete' }));
      process.exit(0);
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error(JSON.stringify({ level: 'error', event: 'startup_failed', message: error.message }));
  process.exit(1);
});
