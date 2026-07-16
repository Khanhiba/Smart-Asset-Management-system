import crypto from 'crypto';
import express from 'express';
import { Asset } from '../models/Asset.js';
import { Assignment } from '../models/Assignment.js';
import { Maintenance } from '../models/Maintenance.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncRoute } from '../utils/appError.js';
import { assetInput } from '../utils/validation.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { calculateAssetRisk, classifyRisk } from '../services/risk.js';
import { recordAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate);

async function hydrateRisk(asset) {
  const [overdue, openMaintenance] = await Promise.all([
    Assignment.exists({ asset: asset._id, returnedAt: null, dueDate: { $lt: new Date() } }),
    Maintenance.exists({ asset: asset._id, status: { $ne: 'resolved' } }),
  ]);
  const riskScore = calculateAssetRisk(asset, { hasOverdueAssignment: Boolean(overdue), hasOpenMaintenance: Boolean(openMaintenance) });
  if (asset.riskScore !== riskScore) { asset.riskScore = riskScore; await asset.save(); }
  return { ...asset.toObject(), riskLevel: classifyRisk(riskScore) };
}

router.get('/', asyncRoute(async (req, res) => {
  const { search, status, category, location, risk, page = '1', limit = '24' } = req.query;
  const query = {};
  if (search) query.$or = [{ assetTag: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }, { serialNumber: new RegExp(search, 'i') }];
  if (status) query.status = status;
  if (category) query.category = category;
  if (location) query.location = location;
  if (risk === 'high') query.riskScore = { $gte: 35 };
  const parsedPage = Math.max(1, Number(page)); const parsedLimit = Math.min(100, Math.max(1, Number(limit)));
  const [assets, total] = await Promise.all([Asset.find(query).sort({ updatedAt: -1 }).skip((parsedPage - 1) * parsedLimit).limit(parsedLimit), Asset.countDocuments(query)]);
  const resolvedAssets = await Promise.all(assets.map(hydrateRisk));
  res.json({ assets: resolvedAssets, total, page: parsedPage, pages: Math.ceil(total / parsedLimit) });
}));

router.post('/', authorize(...STAFF_ROLES), asyncRoute(async (req, res) => {
  const payload = assetInput.parse(req.body);
  if (payload.status === 'assigned') throw new AppError('Use the checkout workflow to assign an asset.', 422);
  const now = new Date();
  const baseDate = payload.lastMaintenanceDate || now;
  const maintenanceIntervalDays = payload.maintenanceIntervalDays || 180;
  const asset = await Asset.create({ ...payload, assetTag: payload.assetTag.toUpperCase(), qrCode: `nexus:${crypto.randomUUID()}`, maintenanceIntervalDays, nextMaintenanceDate: new Date(baseDate.getTime() + maintenanceIntervalDays * 86400000) });
  await recordAudit({ action: 'asset_created', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { assetTag: asset.assetTag, name: asset.name } });
  res.status(201).json({ asset: await hydrateRisk(asset) });
}));

router.get('/lookup/:code', asyncRoute(async (req, res) => {
  const value = decodeURIComponent(req.params.code);
  const asset = await Asset.findOne({ $or: [{ qrCode: value }, { assetTag: value.toUpperCase() }] });
  if (!asset) throw new AppError('No asset matches that QR code or asset tag.', 404);
  res.json({ asset: await hydrateRisk(asset) });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new AppError('Asset not found.', 404);
  const [assignment, maintenance, history] = await Promise.all([
    Assignment.findOne({ asset: asset._id, returnedAt: null }).populate('checkedOutBy', 'name email'),
    Maintenance.find({ asset: asset._id }).populate('assignedTo', 'name').sort({ dueDate: 1 }),
    AuditLog.find({ entityId: asset._id }).populate('actor', 'name').sort({ createdAt: -1 }).limit(30),
  ]);
  res.json({ asset: await hydrateRisk(asset), activeAssignment: assignment, maintenance, history });
}));

router.patch('/:id', authorize(...STAFF_ROLES), asyncRoute(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new AppError('Asset not found.', 404);
  const values = assetInput.partial().parse(req.body);
  if (values.status && values.status === 'assigned') throw new AppError('Use the checkout workflow to assign an asset.', 422);
  if (values.status === 'maintenance') {
    const active = await Assignment.exists({ asset: asset._id, returnedAt: null });
    if (active) throw new AppError('Return the asset before placing it into maintenance.', 422);
  }
  Object.assign(asset, values);
  if (values.lastMaintenanceDate || values.maintenanceIntervalDays) {
    const baseDate = values.lastMaintenanceDate || asset.lastMaintenanceDate || new Date();
    asset.nextMaintenanceDate = new Date(new Date(baseDate).getTime() + asset.maintenanceIntervalDays * 86400000);
  }
  if (values.status === 'retired') asset.retiredAt = new Date();
  await asset.save();
  await recordAudit({ action: 'asset_updated', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { changedFields: Object.keys(values) } });
  res.json({ asset: await hydrateRisk(asset) });
}));

export default router;
