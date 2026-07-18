import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nexus-assets-test';
process.env.JWT_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
process.env.CLIENT_URL = 'http://localhost:5173';

const { default: app } = await import('../src/app.js');

test('health endpoint exposes database readiness and security headers', async () => {
  const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'degraded');
  assert.equal(response.body.database, 'disconnected');
  assert.ok(response.body.requestId);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
});

test('unknown API paths receive a consistent JSON error', async () => {
  const response = await request(app).get('/api/not-a-route');

  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'ROUTE_NOT_FOUND');
  assert.ok(response.body.requestId);
});
