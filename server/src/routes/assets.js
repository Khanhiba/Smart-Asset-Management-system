import crypto from 'crypto';
import express from 'express';
import { Asset } from '../models/Asset.js';
import { Assignment } from '../models/Assignment.js';
import { Maintenance } from '../models/Maintenance.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncRoute } from '../utils/appError.js';
import { assetInput, objectId } from '../utils/validation.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { calculateAssetRisk, classifyRisk } from '../services/risk.js';
import { recordAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function hydrateRisks(assets) {
  if (!assets.length) return [];
  const assetIds = assets.map((asset) => asset._id);
  const [overdueAssetIds, maintenanceAssetIds] = await Promise.all([
    Assignment.distinct('asset', { asset: { $in: assetIds }, returnedAt: null, dueDate: { $lt: new Date() } }),
    Maintenance.distinct('asset', { asset: { $in: assetIds }, status: { $ne: 'resolved' } }),
  ]);
  const overdue = new Set(overdueAssetIds.map(String));
  const maintenance = new Set(maintenanceAssetIds.map(String));
  return assets.map((asset) => {
    const riskScore = calculateAssetRisk(asset, { hasOverdueAssignment: overdue.has(String(asset._id)), hasOpenMaintenance: maintenance.has(String(asset._id)) });
    return { ...asset.toObject(), riskScore, riskLevel: classifyRisk(riskScore) };
  });
}

async function hydrateRisk(asset) {
  return (await hydrateRisks([asset]))[0];
}

router.get('/', asyncRoute(async (req, res) => {
  const { search, status, category, location, risk, page = '1', limit = '24' } = req.query;
  const query = {};
  const searchTerm = typeof search === 'string' ? search.trim().slice(0, 80) : '';
  if (searchTerm) { const pattern = new RegExp(escapeRegex(searchTerm), 'i'); query.$or = [{ assetTag: pattern }, { name: pattern }, { serialNumber: pattern }]; }
  if (typeof status === 'string' && ['available', 'assigned', 'maintenance', 'retired', 'lost'].includes(status)) query.status = status;
  if (typeof category === 'string' && category.trim()) query.category = category.trim().slice(0, 60);
  if (typeof location === 'string' && location.trim()) query.location = location.trim().slice(0, 100);
  if (risk === 'high') query.riskScore = { $gte: 35 };
  const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1); const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 24));
  const [assets, total] = await Promise.all([Asset.find(query).sort({ updatedAt: -1 }).skip((parsedPage - 1) * parsedLimit).limit(parsedLimit), Asset.countDocuments(query)]);
  const resolvedAssets = await hydrateRisks(assets);
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
  const value = decodeURIComponent(req.params.code).trim().slice(0, 256);
  const asset = await Asset.findOne({ $or: [{ qrCode: value }, { assetTag: value.toUpperCase() }] });
  if (!asset) throw new AppError('No asset matches that QR code or asset tag.', 404);
  res.json({ asset: await hydrateRisk(asset) });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const asset = await Asset.findById(objectId(req.params.id, 'Asset'));
  if (!asset) throw new AppError('Asset not found.', 404);
  const [assignment, maintenance, history] = await Promise.all([
    Assignment.findOne({ asset: asset._id, returnedAt: null }).populate('checkedOutBy', 'name email'),
    Maintenance.find({ asset: asset._id }).populate('assignedTo', 'name').sort({ dueDate: 1 }),
    AuditLog.find({ entityId: asset._id }).populate('actor', 'name').sort({ createdAt: -1 }).limit(30),
  ]);
  res.json({ asset: await hydrateRisk(asset), activeAssignment: assignment, maintenance, history });
}));

router.patch('/:id', authorize(...STAFF_ROLES), asyncRoute(async (req, res) => {
  const asset = await Asset.findById(objectId(req.params.id, 'Asset'));
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
