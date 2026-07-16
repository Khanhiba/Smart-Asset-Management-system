import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: 'System' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'deleteOne', 'deleteMany'], function immutable(next) {
  next(new Error('Audit logs are immutable.'));
});
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
