import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAssetRisk, classifyRisk } from '../src/services/risk.js';

const future = new Date(Date.now() + 10 * 86400000);

test('healthy available asset has no risk score', () => {
  const score = calculateAssetRisk({ condition: 'excellent', status: 'available', nextMaintenanceDate: future });
  assert.equal(score, 0);
  assert.equal(classifyRisk(score), 'healthy');
});

test('overdue loan and poor condition escalate risk', () => {
  const score = calculateAssetRisk({ condition: 'poor', status: 'assigned', nextMaintenanceDate: future }, { hasOverdueAssignment: true, hasOpenMaintenance: true });
  assert.equal(score, 78);
  assert.equal(classifyRisk(score), 'critical');
});

test('risk score is capped at one hundred', () => {
  const score = calculateAssetRisk({ condition: 'poor', status: 'lost', nextMaintenanceDate: new Date(Date.now() - 86400000), warrantyExpiry: new Date(Date.now() - 86400000) }, { hasOverdueAssignment: true, hasOpenMaintenance: true });
  assert.equal(score, 100);
});
