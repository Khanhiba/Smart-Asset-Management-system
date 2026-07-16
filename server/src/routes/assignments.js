import express from 'express';
import { Assignment } from '../models/Assignment.js';
import { Asset } from '../models/Asset.js';
import { Maintenance } from '../models/Maintenance.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncRoute } from '../utils/appError.js';
import { assignmentInput, returnInput } from '../utils/validation.js';
import { STAFF_ROLES } from '../utils/roles.js';
import { recordAudit } from '../services/audit.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncRoute(async (req, res) => {
  const state = req.query.state || 'active';
  const query = state === 'active' ? { returnedAt: null } : state === 'overdue' ? { returnedAt: null, dueDate: { $lt: new Date() } } : {};
  const assignments = await Assignment.find(query).populate('asset', 'assetTag name category location status').populate('checkedOutBy', 'name').sort({ dueDate: 1 }).limit(100);
  res.json({ assignments });
}));

router.post('/:assetId/checkout', authorize(...STAFF_ROLES), asyncRoute(async (req, res) => {
  const data = assignmentInput.parse(req.body);
  if (data.dueDate <= new Date()) throw new AppError('Due date must be in the future.', 422);
  const asset = await Asset.findById(req.params.assetId);
  if (!asset) throw new AppError('Asset not found.', 404);
  if (asset.status !== 'available') throw new AppError(`This asset cannot be checked out while it is ${asset.status}.`, 409);
  const assignment = await Assignment.create({ ...data, asset: asset._id, checkedOutBy: req.user._id });
  asset.status = 'assigned'; await asset.save();
  await recordAudit({ action: 'asset_checked_out', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { assigneeName: data.assigneeName, dueDate: data.dueDate } });
  res.status(201).json({ assignment });
}));

router.post('/:assignmentId/return', authorize(...STAFF_ROLES), asyncRoute(async (req, res) => {
  const data = returnInput.parse(req.body);
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError('Assignment not found.', 404);
  if (assignment.returnedAt) throw new AppError('This assignment has already been returned.', 409);
  assignment.returnedAt = new Date(); assignment.returnedBy = req.user._id; assignment.conditionIn = data.conditionIn; assignment.returnNotes = data.returnNotes;
  await assignment.save();
  const asset = await Asset.findById(assignment.asset);
  const unresolvedMaintenance = await Maintenance.exists({ asset: asset._id, status: { $ne: 'resolved' } });
  asset.status = data.conditionIn === 'poor' || unresolvedMaintenance ? 'maintenance' : 'available'; asset.condition = data.conditionIn; await asset.save();
  await recordAudit({ action: 'asset_returned', entityType: 'asset', entityId: asset._id, actor: req.user._id, actorName: req.user.name, details: { conditionIn: data.conditionIn, assignmentId: assignment.id } });
  res.json({ assignment, asset });
}));

export default router;
