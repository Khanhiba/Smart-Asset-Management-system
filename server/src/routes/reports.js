import express from 'express';
import { Asset } from '../models/Asset.js';
import { Maintenance } from '../models/Maintenance.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/appError.js';

const router = express.Router();
router.use(authenticate);

router.get('/inventory', asyncRoute(async (req, res) => {
  const query = {}; if (req.query.status) query.status = req.query.status; if (req.query.category) query.category = req.query.category; if (req.query.location) query.location = req.query.location;
  const assets = await Asset.find(query).sort({ assetTag: 1 }).lean();
  res.json({ generatedAt: new Date(), title: 'Asset Inventory Report', filters: query, totals: { assets: assets.length, available: assets.filter((a) => a.status === 'available').length, inMaintenance: assets.filter((a) => a.status === 'maintenance').length }, rows: assets });
}));

router.get('/maintenance', asyncRoute(async (req, res) => {
  const query = {}; if (req.query.status) query.status = req.query.status;
  const rows = await Maintenance.find(query).populate('asset', 'assetTag name location').populate('assignedTo', 'name').sort({ dueDate: 1 }).lean();
  res.json({ generatedAt: new Date(), title: 'Maintenance Report', filters: query, totals: { tickets: rows.length, unresolved: rows.filter((row) => row.status !== 'resolved').length, totalCost: rows.reduce((total, row) => total + (row.cost || 0), 0) }, rows });
}));

router.get('/audit', asyncRoute(async (req, res) => {
  const rows = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ generatedAt: new Date(), title: 'Asset Audit Report', totals: { events: rows.length }, rows });
}));

export default router;
