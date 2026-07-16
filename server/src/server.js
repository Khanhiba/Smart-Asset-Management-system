import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { connectDatabase } from './config/db.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is required. Copy .env.example to .env.'); process.exit(1); }
connectDatabase(process.env.MONGODB_URI).then(() => {
  app.listen(port, () => console.info(`Nexus API listening on http://localhost:${port}`));
}).catch((error) => { console.error(`Database connection failed: ${error.message}`); process.exit(1); });
