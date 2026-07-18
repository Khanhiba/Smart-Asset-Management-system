import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import assetRoutes from './routes/assets.js';
import assignmentRoutes from './routes/assignments.js';
import maintenanceRoutes from './routes/maintenance.js';
import dashboardRoutes from './routes/dashboard.js';
import insightRoutes from './routes/insights.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import { databaseStatus } from './config/db.js';
import { allowedOrigins } from './config/env.js';
import { AppError } from './utils/appError.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();
const csp = {
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    mediaSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    connectSrc: ["'self'", 'https:'],
    workerSrc: ["'self'", 'blob:'],
  },
};

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});
app.use(helmet({ contentSecurityPolicy: csp, frameguard: { action: 'deny' }, referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, crossOriginEmbedderPolicy: false }));
app.use(compression({ threshold: 1024 }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins().includes(origin)) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS policy.', 403));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please try again shortly.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true, message: { message: 'Too many sign-in attempts. Please try again later.' } });
app.use('/api', apiLimiter);
app.get('/api/health', (req, res) => {
  const database = databaseStatus();
  res.status(database.ready ? 200 : 503).json({ status: database.ready ? 'ok' : 'degraded', service: 'nexus-assets-api', database: database.state, timestamp: new Date().toISOString(), requestId: req.requestId });
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
