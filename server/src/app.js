import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import assignmentRoutes from './routes/assignments.js';
import maintenanceRoutes from './routes/maintenance.js';
import dashboardRoutes from './routes/dashboard.js';
import insightRoutes from './routes/insights.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clientBuild = path.join(projectRoot, 'client', 'dist');
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please try again shortly.' } }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'nexus-assets', mode: process.env.DEMO_FALLBACK === 'true' ? 'demo' : 'database', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
if (existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientBuild, 'index.html'));
  });
}
app.use(notFound);
app.use(errorHandler);
export default app;
