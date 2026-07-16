import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInsights } from '../src/services/insights.js';

test('insights use deterministic fallback without an API key', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const result = await generateInsights({ totalAssets: 10, availableAssets: 7, availableRate: 70, overdueLoans: 2, openMaintenance: 1, lowCondition: 1, warrantyExpiring: 3 });
  if (previous) process.env.OPENAI_API_KEY = previous;
  assert.equal(result.source, 'rules');
  assert.ok(result.insights.some((item) => item.title.includes('overdue loan')));
  assert.ok(result.insights.length >= 3);
});
