import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/appError.js';
import { objectId } from '../utils/validation.js';

const router = express.Router();
router.use(authenticate);
router.get('/', asyncRoute(async (req, res) => {
  const { entityId, limit = '100' } = req.query;
  const query = typeof entityId === 'string' && entityId ? { entityId: objectId(entityId, 'Audit entity') } : {};
  const parsedLimit = Math.min(500, Math.max(1, Number.parseInt(String(limit), 10) || 100));
  const logs = await AuditLog.find(query).populate('actor', 'name email role').sort({ createdAt: -1 }).limit(parsedLimit);
  res.json({ logs });
}));
export default router;
