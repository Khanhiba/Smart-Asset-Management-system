import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['preventive', 'repair', 'inspection', 'calibration'], default: 'preventive' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
  dueDate: { type: Date, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  cost: { type: Number, min: 0 },
  notes: { type: String, trim: true, maxlength: 1200 },
  resolutionNotes: { type: String, trim: true, maxlength: 1200 },
}, { timestamps: true });

export const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
