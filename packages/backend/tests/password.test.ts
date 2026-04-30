import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword, verifyPassword} from '../src/security/password';

test('hashPassword and verifyPassword', () => {
  const stored = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
});

