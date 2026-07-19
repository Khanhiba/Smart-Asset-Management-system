import express from 'express';
import { Asset } from '../models/Asset.js';
import { Assignment } from '../models/Assignment.js';
import { Maintenance } from '../models/Maintenance.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/appError.js';
import { calculateAssetRisk, classifyRisk } from '../services/risk.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncRoute(async (req, res) => {
  const now = new Date(); const warrantyWindow = new Date(now.getTime() + 45 * 86400000);
  const [total, available, assigned, maintenance, overdueLoans, dueMaintenance, warrantyExpiring, category, locations, conditions, recent, riskCandidates, overdueAssetIds, openMaintenanceAssetIds] = await Promise.all([
    Asset.countDocuments({ status: { $ne: 'retired' } }), Asset.countDocuments({ status: 'available' }), Asset.countDocuments({ status: 'assigned' }), Asset.countDocuments({ status: 'maintenance' }),
    Assignment.find({ returnedAt: null, dueDate: { $lt: now } }).populate('asset', 'assetTag name').limit(8),
    Maintenance.find({ status: { $ne: 'resolved' }, dueDate: { $lte: new Date(now.getTime() + 30 * 86400000) } }).populate('asset', 'assetTag name').sort({ dueDate: 1 }).limit(8),
    Asset.find({ warrantyExpiry: { $gte: now, $lte: warrantyWindow }, status: { $ne: 'retired' } }).select('assetTag name warrantyExpiry').sort({ warrantyExpiry: 1 }).limit(8),
    Asset.aggregate([{ $match: { status: { $ne: 'retired' } } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    Asset.aggregate([{ $match: { status: { $ne: 'retired' } } }, { $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
    Asset.aggregate([{ $match: { status: { $ne: 'retired' } } }, { $group: { _id: '$condition', count: { $sum: 1 } } }]),
    AuditLog.find({ action: { $ne: 'demo_inventory_seeded' } }).populate('actor', 'name').sort({ createdAt: -1 }).limit(7),
    Asset.find({ status: { $ne: 'retired' } }),
    Assignment.distinct('asset', { returnedAt: null, dueDate: { $lt: now } }),
    Maintenance.distinct('asset', { status: { $ne: 'resolved' } }),
  ]);
  const overdueSet = new Set(overdueAssetIds.map(String)); const maintenanceSet = new Set(openMaintenanceAssetIds.map(String));
  const riskAlerts = riskCandidates.map((asset) => {
    const riskScore = calculateAssetRisk(asset, { hasOverdueAssignment: overdueSet.has(String(asset._id)), hasOpenMaintenance: maintenanceSet.has(String(asset._id)) });
    return { ...asset.toObject(), riskScore, riskLevel: classifyRisk(riskScore) };
  }).filter((asset) => asset.riskScore >= 15).sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);
  res.json({ metrics: { total, available, assigned, maintenance, overdueLoans: overdueLoans.length }, charts: { category, locations, conditions }, alerts: { overdueLoans, dueMaintenance, warrantyExpiring, riskAlerts }, recent });
}));

export default router;
