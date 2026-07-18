export const DEMO_TOKEN_PREFIX = 'nexus-demo:';
const DAY = 86400000;
const dateFromNow = (days) => new Date(Date.now() + days * DAY).toISOString();

export const DEMO_ACCOUNTS = [
  { user: { id: 'demo-admin', name: 'Irha Hasan', email: 'admin@nexus.edu', role: 'admin', department: 'IT Operations' }, password: 'NexusDemo!2026' },
  { user: { id: 'demo-manager', name: 'Maya Patel', email: 'manager@nexus.edu', role: 'asset_manager', department: 'IT Operations' }, password: 'NexusDemo!2026' },
  { user: { id: 'demo-technician', name: 'Rohan Das', email: 'technician@nexus.edu', role: 'technician', department: 'Technical Services' }, password: 'NexusDemo!2026' },
  { user: { id: 'demo-viewer', name: 'Dr. Sara Khan', email: 'viewer@nexus.edu', role: 'viewer', department: 'Physics' }, password: 'NexusDemo!2026' },
];

export const isDemoToken = (token) => typeof token === 'string' && token.startsWith(DEMO_TOKEN_PREFIX);
const clone = (value) => JSON.parse(JSON.stringify(value));
const tokenFor = (account) => DEMO_TOKEN_PREFIX + encodeURIComponent(account.user.email);
const accountForToken = (token) => DEMO_ACCOUNTS.find((account) => tokenFor(account) === token) || DEMO_ACCOUNTS[0];

export function createDemoSession(email, password) {
  const account = DEMO_ACCOUNTS.find((item) => item.user.email === email.trim().toLowerCase() && item.password === password);
  return account ? { token: tokenFor(account), user: clone(account.user), mode: 'demo' } : null;
}

let demoAssets = [
  ['asset-1', 'AST-IT-001', 'MacBook Pro 14', 'Laptop', 'Innovation Lab', 'assigned', 'excellent', 38],
  ['asset-2', 'AST-IT-002', 'Dell Latitude 7440', 'Laptop', 'IT Store', 'available', 'good', 0],
  ['asset-3', 'AST-AV-014', 'Epson Laser Projector', 'Projector', 'Auditorium A', 'available', 'fair', 30],
  ['asset-4', 'AST-LAB-023', 'Digital Oscilloscope', 'Laboratory Equipment', 'Electronics Lab 2', 'maintenance', 'poor', 64],
  ['asset-5', 'AST-NET-006', 'Cisco Catalyst Switch', 'Networking', 'Data Center', 'available', 'good', 0],
  ['asset-6', 'AST-AV-019', 'Sony Mirrorless Camera', 'Camera', 'Media Centre', 'available', 'good', 0],
  ['asset-7', 'AST-PR-003', 'HP LaserJet Pro', 'Printer', 'Library Level 1', 'available', 'fair', 16],
  ['asset-8', 'AST-FUR-010', 'Ergonomic Study Chair', 'Furniture', 'Design Studio', 'available', 'good', 0],
].map(([id, assetTag, name, category, location, status, condition, riskScore]) => ({
  id, _id: id, assetTag, name, category, location, status, condition, riskScore,
  riskLevel: riskScore >= 60 ? 'critical' : riskScore >= 35 ? 'high' : riskScore ? 'watch' : 'healthy',
  department: 'Engineering & Sciences', manufacturer: category === 'Laptop' ? 'Dell' : 'Nexus Demo',
  model: 'Campus Edition', serialNumber: 'SN-' + assetTag, qrCode: 'nexus-demo:' + assetTag,
  purchaseDate: dateFromNow(-460), purchaseCost: 50000, warrantyExpiry: dateFromNow(assetTag === 'AST-AV-014' ? 19 : 180),
  maintenanceIntervalDays: 180, lastMaintenanceDate: dateFromNow(-80), nextMaintenanceDate: dateFromNow(assetTag === 'AST-AV-014' ? -4 : 100),
  notes: 'Temporary demo-mode record. Changes reset when this browser session ends.',
}));

let demoAssignments = [{ id: 'assignment-1', _id: 'assignment-1', asset: 'asset-1', assigneeName: 'Nisha Verma', assigneeEmail: 'nisha.verma@nexus.edu', assigneeDepartment: 'Robotics Club', checkedOutAt: dateFromNow(-10), dueDate: dateFromNow(-3), conditionOut: 'excellent', returnedAt: null }];
let demoMaintenance = [
  { id: 'maintenance-1', _id: 'maintenance-1', asset: 'asset-4', title: 'Signal calibration drift', type: 'calibration', priority: 'high', status: 'in_progress', dueDate: dateFromNow(2), assignedTo: { name: 'Rohan Das' }, notes: 'Waveform shows repeatable offset above 5V.', createdAt: dateFromNow(-2) },
  { id: 'maintenance-2', _id: 'maintenance-2', asset: 'asset-3', title: 'Preventive projector service', type: 'preventive', priority: 'medium', status: 'open', dueDate: dateFromNow(5), assignedTo: { name: 'Rohan Das' }, notes: 'Clean filters and inspect lamp runtime.', createdAt: dateFromNow(-1) },
];
let demoEvents = [
  { id: 'event-1', action: 'asset_checked_out', entityType: 'asset', entityId: 'asset-1', actorName: 'Maya Patel', createdAt: dateFromNow(-10) },
  { id: 'event-2', action: 'maintenance_opened', entityType: 'asset', entityId: 'asset-4', actorName: 'Irha Hasan', createdAt: dateFromNow(-2) },
  { id: 'event-3', action: 'asset_created', entityType: 'asset', entityId: 'asset-3', actorName: 'Irha Hasan', createdAt: dateFromNow(-15) },
];

const assetFor = (id) => demoAssets.find((asset) => asset.id === id || asset._id === id || asset.assetTag === id);
const ticketView = (ticket) => ({ ...ticket, asset: typeof ticket.asset === 'string' ? assetFor(ticket.asset) : ticket.asset });
const assignmentView = (assignment) => ({ ...assignment, asset: typeof assignment.asset === 'string' ? assetFor(assignment.asset) : assignment.asset });
const recordEvent = (user, action, assetId) => demoEvents.unshift({ id: 'event-' + Date.now(), action, entityType: 'asset', entityId: assetId, actor: user, actorName: user.name, createdAt: new Date().toISOString() });

function dashboardData() {
  const activeLoans = demoAssignments.filter((assignment) => !assignment.returnedAt);
  const openTickets = demoMaintenance.filter((ticket) => ticket.status !== 'resolved');
  const group = (items, key) => Object.entries(items.reduce((all, item) => ({ ...all, [item[key]]: (all[item[key]] || 0) + 1 }), {})).map(([_id, count]) => ({ _id, count }));
  return {
    metrics: { total: demoAssets.length, available: demoAssets.filter((asset) => asset.status === 'available').length, assigned: demoAssets.filter((asset) => asset.status === 'assigned').length, maintenance: demoAssets.filter((asset) => asset.status === 'maintenance').length, overdueLoans: activeLoans.filter((assignment) => new Date(assignment.dueDate) < new Date()).length },
    charts: { category: group(demoAssets, 'category'), locations: group(demoAssets, 'location'), conditions: group(demoAssets, 'condition') },
    alerts: { overdueLoans: activeLoans.filter((assignment) => new Date(assignment.dueDate) < new Date()).map(assignmentView), dueMaintenance: openTickets.map(ticketView), warrantyExpiring: demoAssets.filter((asset) => new Date(asset.warrantyExpiry) < new Date(Date.now() + 45 * DAY)), riskAlerts: demoAssets.filter((asset) => asset.riskScore >= 15).sort((a, b) => b.riskScore - a.riskScore) },
    recent: demoEvents.slice(0, 7),
  };
}

export function demoRequest(path, { token, method = 'GET', body } = {}) {
  const user = accountForToken(token).user;
  const url = new URL(path, 'https://nexus.demo');
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const now = new Date().toISOString();
  const canEditAssets = ['admin', 'asset_manager'].includes(user.role);
  const canMaintain = ['admin', 'asset_manager', 'technician'].includes(user.role);

  if (pathname === '/api/auth/me') return { user: clone(user) };
  if (pathname === '/api/dashboard') return dashboardData();
  if (pathname === '/api/insights') return { source: 'rules', summary: 'Demo Mode is active because the production API is unavailable. Changes stay in this browser only.', insights: [{ level: 'high', title: '1 overdue loan', body: 'Follow up with the Robotics Club to return the MacBook Pro.', action: 'Review overdue assets' }, { level: 'medium', title: '2 maintenance items', body: 'Complete calibration and preventive service before the next booking cycle.', action: 'Open maintenance queue' }, { level: 'positive', title: 'Demo portfolio is ready', body: 'Reconnect the API to persist these workflows in MongoDB Atlas.', action: 'View inventory' }] };
  if (pathname === '/api/assets' && method === 'GET') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const assets = demoAssets.filter((asset) => (!search || (asset.assetTag + ' ' + asset.name + ' ' + asset.serialNumber).toLowerCase().includes(search)) && (!status || asset.status === status) && (!category || asset.category === category));
    return { assets: clone(assets), total: assets.length, page: 1, pages: 1 };
  }
  if (pathname === '/api/assets' && method === 'POST') {
    if (!canEditAssets) throw new Error('You do not have permission for this action.');
    const id = 'asset-' + Date.now();
    const asset = { ...body, id, _id: id, qrCode: 'nexus-demo:' + body.assetTag, status: body.status || 'available', condition: body.condition || 'good', riskScore: 0, riskLevel: 'healthy', nextMaintenanceDate: dateFromNow(Number(body.maintenanceIntervalDays || 180)), createdAt: now };
    demoAssets.unshift(asset); recordEvent(user, 'asset_created', id); return { asset: clone(asset) };
  }
  if (pathname.startsWith('/api/assets/lookup/')) {
    const code = decodeURIComponent(segments.at(-1));
    const asset = demoAssets.find((item) => item.assetTag === code || item.qrCode === code);
    if (!asset) throw new Error('No asset matches that QR code or asset tag.');
    return { asset: clone(asset) };
  }
  if (pathname.startsWith('/api/assets/')) {
    const asset = assetFor(segments.at(-1));
    if (!asset) throw new Error('Asset not found.');
    if (method === 'PATCH') {
      if (!canEditAssets) throw new Error('You do not have permission for this action.');
      Object.assign(asset, body); recordEvent(user, 'asset_updated', asset.id); return { asset: clone(asset) };
    }
    const activeAssignment = demoAssignments.find((assignment) => assignment.asset === asset.id && !assignment.returnedAt);
    return { asset: clone(asset), activeAssignment: activeAssignment ? assignmentView(activeAssignment) : null, maintenance: demoMaintenance.filter((ticket) => ticket.asset === asset.id).map(ticketView), history: demoEvents.filter((entry) => entry.entityId === asset.id).slice(0, 30) };
  }
  if (pathname.startsWith('/api/assignments/') && pathname.endsWith('/checkout')) {
    if (!canEditAssets) throw new Error('You do not have permission for this action.');
    const asset = assetFor(segments.at(-2));
    if (!asset || asset.status !== 'available') throw new Error('This asset is not available for checkout.');
    const assignment = { ...body, id: 'assignment-' + Date.now(), _id: 'assignment-' + Date.now(), asset: asset.id, checkedOutAt: now, checkedOutBy: user, returnedAt: null };
    demoAssignments.unshift(assignment); asset.status = 'assigned'; recordEvent(user, 'asset_checked_out', asset.id); return { assignment: assignmentView(assignment) };
  }
  if (pathname.startsWith('/api/assignments/') && pathname.endsWith('/return')) {
    if (!canEditAssets) throw new Error('You do not have permission for this action.');
    const assignment = demoAssignments.find((item) => item.id === segments.at(-2));
    if (!assignment || assignment.returnedAt) throw new Error('Assignment is not available for return.');
    assignment.returnedAt = now; assignment.conditionIn = body.conditionIn; assignment.returnNotes = body.returnNotes;
    const asset = assetFor(assignment.asset); asset.status = body.conditionIn === 'poor' ? 'maintenance' : 'available'; asset.condition = body.conditionIn; recordEvent(user, 'asset_returned', asset.id);
    return { assignment: assignmentView(assignment), asset: clone(asset) };
  }
  if (pathname === '/api/assignments') return { assignments: demoAssignments.filter((assignment) => !assignment.returnedAt).map(assignmentView) };
  if (pathname === '/api/maintenance' && method === 'GET') {
    const status = url.searchParams.get('status');
    return { tickets: demoMaintenance.filter((ticket) => !status || ticket.status === status).map(ticketView) };
  }
  if (pathname === '/api/maintenance' && method === 'POST') {
    if (!canMaintain) throw new Error('You do not have permission for this action.');
    const asset = assetFor(body.assetId);
    if (!asset) throw new Error('Asset not found.');
    const ticket = { ...body, id: 'maintenance-' + Date.now(), _id: 'maintenance-' + Date.now(), asset: asset.id, status: 'open', createdAt: now };
    demoMaintenance.unshift(ticket); asset.status = 'maintenance'; recordEvent(user, 'maintenance_opened', asset.id); return { ticket: ticketView(ticket) };
  }
  if (pathname.startsWith('/api/maintenance/')) {
    if (!canMaintain) throw new Error('You do not have permission for this action.');
    const ticket = demoMaintenance.find((item) => item.id === segments.at(-1));
    if (!ticket || ticket.status === 'resolved') throw new Error('Maintenance ticket is not available for update.');
    Object.assign(ticket, body);
    const asset = assetFor(ticket.asset);
    if (body.status === 'resolved') {
      ticket.resolvedAt = now;
      if (!demoMaintenance.some((item) => item.asset === asset.id && item.status !== 'resolved')) asset.status = 'available';
      recordEvent(user, 'maintenance_resolved', asset.id);
    } else recordEvent(user, 'maintenance_started', asset.id);
    return { ticket: ticketView(ticket), asset: clone(asset) };
  }
  if (pathname.startsWith('/api/reports/')) {
    const type = segments.at(-1);
    if (type === 'inventory') return { generatedAt: now, title: 'Asset Inventory Report', totals: { assets: demoAssets.length, available: demoAssets.filter((asset) => asset.status === 'available').length, inMaintenance: demoAssets.filter((asset) => asset.status === 'maintenance').length }, rows: clone(demoAssets) };
    if (type === 'maintenance') return { generatedAt: now, title: 'Maintenance Report', totals: { tickets: demoMaintenance.length, unresolved: demoMaintenance.filter((ticket) => ticket.status !== 'resolved').length, totalCost: 0 }, rows: demoMaintenance.map(ticketView) };
    return { generatedAt: now, title: 'Asset Audit Report', totals: { events: demoEvents.length }, rows: clone(demoEvents) };
  }
  throw new Error('This demo action is not available.');
}
