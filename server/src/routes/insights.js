import express from 'express';
import { Asset } from '../models/Asset.js';
import { Assignment } from '../models/Assignment.js';
import { Maintenance } from '../models/Maintenance.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/appError.js';
import { generateInsights } from '../services/insights.js';

const router = express.Router();
router.use(authenticate);
router.get('/', asyncRoute(async (req, res) => {
  const now = new Date(); const warrantyWindow = new Date(now.getTime() + 45 * 86400000);
  const [total, available, overdueLoans, openMaintenance, lowCondition, warrantyExpiring] = await Promise.all([
    Asset.countDocuments({ status: { $ne: 'retired' } }), Asset.countDocuments({ status: 'available' }), Assignment.countDocuments({ returnedAt: null, dueDate: { $lt: now } }),
    Maintenance.countDocuments({ status: { $ne: 'resolved' } }), Asset.countDocuments({ condition: 'poor', status: { $ne: 'retired' } }), Asset.countDocuments({ warrantyExpiry: { $gte: now, $lte: warrantyWindow } }),
  ]);
  res.json(await generateInsights({ totalAssets: total, availableAssets: available, availableRate: total ? Math.round((available / total) * 100) : 0, overdueLoans, openMaintenance, lowCondition, warrantyExpiring }));
}));
export default router;
