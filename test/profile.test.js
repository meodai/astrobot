// test/profile.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-'));
  process.env.ASTROBOT_DIR = tmp;
  delete require.cache[require.resolve('../lib/profile.js')];
  delete require.cache[require.resolve('../lib/paths.js')];
});

test('load returns empty object when no file exists', () => {
  const profile = require('../lib/profile.js');
  assert.deepStrictEqual(profile.load(), {});
});

test('save then get roundtrips and sets _default', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  assert.deepStrictEqual(profile.get('claude-x'), { color: { name: 'Teal' } });
  assert.strictEqual(profile.load()._default, 'claude-x');
});

test('resolve returns own profile, and falls back to _default ONLY when model omitted', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  assert.strictEqual(profile.resolve('claude-x').model, 'claude-x'); // own profile
  assert.strictEqual(profile.resolve(undefined).model, 'claude-x');  // omitted -> _default
  assert.strictEqual(profile.resolve('unknown'), null);              // present-but-unborn -> silent
});

test('resolve returns null when store is empty', () => {
  const profile = require('../lib/profile.js');
  assert.strictEqual(profile.resolve('anything'), null);
  assert.strictEqual(profile.resolve(undefined), null);
});

test('corrupt JSON is treated as empty, never throws', () => {
  fs.writeFileSync(path.join(tmp, 'profiles.json'), '{not valid json');
  const profile = require('../lib/profile.js');
  assert.deepStrictEqual(profile.load(), {});
});

test('setHavoc returns true and persists havoc:true, leaves _default unchanged', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  const ok = profile.setHavoc('claude-x', true);
  assert.strictEqual(ok, true);
  assert.strictEqual(profile.get('claude-x').havoc, true);
  assert.strictEqual(profile.load()._default, 'claude-x'); // _default unchanged
});

test('setHavoc false clears havoc flag', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' }, havoc: true });
  profile.setHavoc('claude-x', false);
  assert.strictEqual(profile.get('claude-x').havoc, false);
});

test('setHavoc returns false for unknown model', () => {
  const profile = require('../lib/profile.js');
  const ok = profile.setHavoc('unknown', true);
  assert.strictEqual(ok, false);
});

test('setHavoc does NOT change _default (remains a plain model-id string)', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  profile.setHavoc('claude-x', true);
  const store = profile.load();
  // _default must still be the plain model-id string, not an object
  assert.strictEqual(store._default, 'claude-x');
  assert.strictEqual(typeof store._default, 'string');
});

// --- _user / setUser / getUser / clearUser / list ---

test('setUser / getUser roundtrip', () => {
  const profile = require('../lib/profile.js');
  const userData = { birth: { datetime: '1990-05-05T09:30:00' }, chart: { sun: { sign: 'Taurus' } } };
  profile.setUser(userData);
  assert.deepStrictEqual(profile.getUser(), userData);
});

test('clearUser removes _user, getUser returns null', () => {
  const profile = require('../lib/profile.js');
  profile.setUser({ birth: {}, chart: {} });
  profile.clearUser();
  assert.strictEqual(profile.getUser(), null);
});

test('getUser returns null when no user has been stored', () => {
  const profile = require('../lib/profile.js');
  assert.strictEqual(profile.getUser(), null);
});

test('list() excludes keys starting with underscore', () => {
  const profile = require('../lib/profile.js');
  profile.save('real-model', { color: { name: 'Teal' } });
  profile.setUser({ birth: {}, chart: {} });
  const keys = profile.list();
  assert.ok(!keys.includes('_user'), '_user must not appear in list()');
  assert.ok(!keys.includes('_default'), '_default must not appear in list()');
  assert.ok(keys.includes('real-model'), 'real-model should be in list()');
});

test('_user is not resolvable via resolve("_user")', () => {
  const profile = require('../lib/profile.js');
  profile.setUser({ birth: {}, chart: {} });
  assert.strictEqual(profile.resolve('_user'), null);
});

test('_user is not accessible via get("_user")', () => {
  const profile = require('../lib/profile.js');
  profile.setUser({ birth: {}, chart: {} });
  assert.strictEqual(profile.get('_user'), null);
});

test('_default resolution still works after setUser', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  profile.setUser({ birth: {}, chart: {} });
  const resolved = profile.resolve(undefined);
  assert.ok(resolved, 'resolve(undefined) should still find _default');
  assert.strictEqual(resolved.model, 'claude-x');
});

test('setHavoc returns false for _user key', () => {
  const profile = require('../lib/profile.js');
  profile.setUser({ birth: {}, chart: {} });
  const ok = profile.setHavoc('_user', true);
  assert.strictEqual(ok, false);
});
