import express from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/appError.js';

const router = express.Router();
router.use(authenticate);
router.get('/', asyncRoute(async (req, res) => {
  const { entityId, limit = '100' } = req.query;
  const query = entityId ? { entityId } : {};
  const logs = await AuditLog.find(query).populate('actor', 'name email role').sort({ createdAt: -1 }).limit(Math.min(500, Number(limit)));
  res.json({ logs });
}));
export default router;
