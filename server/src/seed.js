import crypto from 'crypto';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { runtime, validateEnvironment } from './config/env.js';
import { User } from './models/User.js';
import { Asset } from './models/Asset.js';
import { Assignment } from './models/Assignment.js';
import { Maintenance } from './models/Maintenance.js';
import { AuditLog } from './models/AuditLog.js';

const days = (number) => new Date(Date.now() + number * 86400000);
const asset = (assetTag, name, category, location, overrides = {}) => ({ assetTag, name, category, location, department: 'Engineering & Sciences', manufacturer: 'Nexus Demo', model: 'Campus Edition', serialNumber: `SN-${assetTag}`, qrCode: `nexus:${crypto.randomUUID()}`, condition: 'good', purchaseDate: days(-460), purchaseCost: 50000, warrantyExpiry: days(180), maintenanceIntervalDays: 180, lastMaintenanceDate: days(-80), nextMaintenanceDate: days(100), ...overrides });

async function upsertUser(values) {
  let user = await User.findOne({ email: values.email });
  if (!user) return User.create(values);
  if (user.name !== values.name || user.role !== values.role || user.department !== values.department) {
    user.name = values.name;
    user.role = values.role;
    user.department = values.department;
    await user.save();
  }
  return user;
}

export async function seedDemoData() {
  const [admin, manager, technician, viewer] = await Promise.all([
    upsertUser({ name: 'Irha Hasan', email: 'admin@nexus.edu', password: 'NexusDemo!2026', role: 'admin', department: 'IT Operations' }),
    upsertUser({ name: 'Maya Patel', email: 'manager@nexus.edu', password: 'NexusDemo!2026', role: 'asset_manager', department: 'IT Operations' }),
    upsertUser({ name: 'Rohan Das', email: 'technician@nexus.edu', password: 'NexusDemo!2026', role: 'technician', department: 'Technical Services' }),
    upsertUser({ name: 'Dr. Sara Khan', email: 'viewer@nexus.edu', password: 'NexusDemo!2026', role: 'viewer', department: 'Physics' }),
  ]);
  const records = [
    asset('AST-IT-001', 'MacBook Pro 14', 'Laptop', 'Innovation Lab', { manufacturer: 'Apple', model: 'MacBook Pro M3', purchaseCost: 169900, warrantyExpiry: days(34) }),
    asset('AST-IT-002', 'Dell Latitude 7440', 'Laptop', 'IT Store', { manufacturer: 'Dell', model: 'Latitude 7440' }),
    asset('AST-AV-014', 'Epson Laser Projector', 'Projector', 'Auditorium A', { manufacturer: 'Epson', model: 'EB-L260F', condition: 'fair', nextMaintenanceDate: days(-4), warrantyExpiry: days(19) }),
    asset('AST-LAB-023', 'Digital Oscilloscope', 'Laboratory Equipment', 'Electronics Lab 2', { manufacturer: 'Tektronix', model: 'TBS 1052B', condition: 'poor', status: 'maintenance', nextMaintenanceDate: days(-11) }),
    asset('AST-NET-006', 'Cisco Catalyst Switch', 'Networking', 'Data Center', { manufacturer: 'Cisco', model: 'C9200L-24T', purchaseCost: 83000, nextMaintenanceDate: days(12) }),
    asset('AST-AV-019', 'Sony Mirrorless Camera', 'Camera', 'Media Centre', { manufacturer: 'Sony', model: 'A7 IV', purchaseCost: 229990 }),
    asset('AST-PR-003', 'HP LaserJet Pro', 'Printer', 'Library Level 1', { manufacturer: 'HP', model: 'M404dn', condition: 'fair', nextMaintenanceDate: days(4) }),
    asset('AST-FUR-010', 'Ergonomic Study Chair', 'Furniture', 'Design Studio', { manufacturer: 'Ergo', model: 'Flex 2' }),
  ];
  const created = [];
  for (const record of records) {
    const existing = await Asset.findOne({ assetTag: record.assetTag });
    created.push(existing || await Asset.create(record));
  }
  const loanAsset = created.find((item) => item.assetTag === 'AST-IT-001');
  if (!await Assignment.exists({ asset: loanAsset._id, returnedAt: null })) {
    loanAsset.status = 'assigned'; await loanAsset.save();
    await Assignment.create({ asset: loanAsset._id, assigneeName: 'Nisha Verma', assigneeEmail: 'nisha.verma@nexus.edu', assigneeDepartment: 'Robotics Club', checkedOutBy: manager._id, dueDate: days(-3), conditionOut: 'excellent', checkoutNotes: 'Capstone robotics demonstration.' });
  }
  const repairAsset = created.find((item) => item.assetTag === 'AST-LAB-023');
  if (!await Maintenance.exists({ asset: repairAsset._id, status: { $ne: 'resolved' } })) await Maintenance.create({ asset: repairAsset._id, title: 'Signal calibration drift', type: 'calibration', priority: 'high', status: 'in_progress', dueDate: days(2), assignedTo: technician._id, createdBy: manager._id, notes: 'Waveform shows repeatable offset above 5V.' });
  const projector = created.find((item) => item.assetTag === 'AST-AV-014');
  if (!await Maintenance.exists({ asset: projector._id, status: { $ne: 'resolved' } })) await Maintenance.create({ asset: projector._id, title: 'Preventive projector service', type: 'preventive', priority: 'medium', dueDate: days(5), assignedTo: technician._id, createdBy: manager._id, notes: 'Clean filters and inspect lamp runtime.' });
  if (!await AuditLog.exists()) await AuditLog.create({ action: 'demo_inventory_seeded', entityType: 'system', entityId: admin._id, actor: admin._id, actorName: admin.name, details: { assets: created.length } });
  console.info(JSON.stringify({ level: 'info', event: 'demo_seed_complete', assets: created.length }));
}

async function run() {
  const config = validateEnvironment();
  if (runtime.environment === 'production') throw new Error('The sample-data seed is disabled in production. Create the first real administrator with npm run bootstrap:admin.');
  await connectDatabase(config.mongoUri);
  await seedDemoData();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => { console.error(JSON.stringify({ level: 'error', event: 'seed_failed', message: error.message })); process.exitCode = 1; }).finally(disconnectDatabase);
}
