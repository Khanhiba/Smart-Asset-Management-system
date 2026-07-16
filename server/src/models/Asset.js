import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetTag: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^AST-[A-Z0-9-]{3,}$/ },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  manufacturer: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNumber: { type: String, trim: true, sparse: true },
  location: { type: String, required: true, trim: true },
  department: { type: String, trim: true, default: 'General' },
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  status: { type: String, enum: ['available', 'assigned', 'maintenance', 'retired', 'lost'], default: 'available', index: true },
  purchaseDate: Date,
  purchaseCost: { type: Number, min: 0 },
  warrantyExpiry: Date,
  qrCode: { type: String, unique: true, required: true },
  imageUrl: { type: String, trim: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  maintenanceIntervalDays: { type: Number, min: 1, default: 180 },
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  retiredAt: Date,
}, { timestamps: true });

assetSchema.index({ name: 'text', assetTag: 'text', category: 'text', location: 'text' });
export const Asset = mongoose.model('Asset', assetSchema);
