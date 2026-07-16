import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  assigneeName: { type: String, required: true, trim: true },
  assigneeEmail: { type: String, trim: true, lowercase: true },
  assigneeDepartment: { type: String, trim: true },
  checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkedOutAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: Date,
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conditionOut: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  conditionIn: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
  checkoutNotes: { type: String, trim: true, maxlength: 500 },
  returnNotes: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

assignmentSchema.index({ asset: 1, returnedAt: 1 });
export const Assignment = mongoose.model('Assignment', assignmentSchema);
