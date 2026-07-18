import assert from 'node:assert/strict';
import test from 'node:test';
import { registrationInput } from '../src/utils/validation.js';

test('registration input accepts a valid viewer account and uses the default department', () => {
  const values = registrationInput.parse({
    name: 'New User',
    email: 'new.user@example.edu',
    password: 'A-safe-password-2026',
  });

  assert.equal(values.department, 'General');
  assert.equal(values.email, 'new.user@example.edu');
});

test('registration input rejects role escalation and short passwords', () => {
  assert.throws(() => registrationInput.parse({
    name: 'New User',
    email: 'new.user@example.edu',
    password: 'short',
    role: 'admin',
  }));
});
