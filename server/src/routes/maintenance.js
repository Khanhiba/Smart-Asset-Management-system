import express from 'express';
import { Maintenance } from '../models/Maintenance.js';
import { Asset } from '../models/Asset.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncRoute } from '../utils/appError.js';
import { maintenanceInput, maintenanceResolution, objectId } from '../utils/validation.js';
import { MAINTENANCE_ROLES } from '../utils/roles.js';
import { recordAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncRoute(async (req, res) => {
  const query = {};
  if (typeof req.query.status === 'string' && ['open', 'in_progress', 'resolved'].includes(req.query.status)) query.status = req.query.status;
  if (typeof req.query.priority === 'string' && ['low', 'medium', 'high', 'critical'].includes(req.query.priority)) query.priority = req.query.priority;
  const tickets = await Maintenance.find(query).populate('asset', 'assetTag name location condition').populate('assignedTo', 'name email').sort({ status: 1, dueDate: 1 }).limit(100);
  res.json({ tickets });
}));

router.post('/', authorize(...MAINTENANCE_ROLES), asyncRoute(async (req, res) => {
  const data = maintenanceInput.parse(req.body);
  const asset = await Asset.findById(objectId(data.assetId, 'Asset'));
  if (!asset) throw new AppError('Asset not found.', 404);
  if (asset.status === 'retired' || asset.status === 'lost') throw new AppError('A retired or lost asset cannot receive maintenance.', 422);
  const ticket = await Maintenance.create({ ...data, asset: asset._id, createdBy: req.user._id });
  if (asset.status !== 'assigned') { asset.status = 'maintenance'; await asset.save(); }
  await recordAudit({ action: 'maintenance_opened', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { ticketId: ticket.id, title: ticket.title, priority: ticket.priority } });
  res.status(201).json({ ticket });
}));

router.patch('/:id', authorize(...MAINTENANCE_ROLES), asyncRoute(async (req, res) => {
  const data = maintenanceResolution.parse(req.body);
  const ticket = await Maintenance.findById(objectId(req.params.id, 'Maintenance ticket'));
  if (!ticket) throw new AppError('Maintenance ticket not found.', 404);
  if (ticket.status === 'resolved') throw new AppError('This maintenance ticket is already resolved.', 409);
  ticket.status = data.status; ticket.cost = data.cost; ticket.resolutionNotes = data.resolutionNotes;
  if (data.status === 'resolved') { ticket.resolvedAt = new Date(); ticket.resolvedBy = req.user._id; }
  await ticket.save();
  const asset = await Asset.findById(ticket.asset);
  if (!asset) throw new AppError('The maintenance asset no longer exists.', 409);
  if (data.status === 'resolved') {
    const unresolved = await Maintenance.exists({ asset: asset._id, status: { $ne: 'resolved' }, _id: { $ne: ticket._id } });
    if (!unresolved && asset.status === 'maintenance') asset.status = 'available';
    asset.lastMaintenanceDate = new Date();
    asset.nextMaintenanceDate = new Date(Date.now() + asset.maintenanceIntervalDays * 86400000);
    await asset.save();
  }
  await recordAudit({ action: data.status === 'resolved' ? 'maintenance_resolved' : 'maintenance_started', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { ticketId: ticket.id, cost: data.cost } });
  res.json({ ticket, asset });
}));

export default router;
