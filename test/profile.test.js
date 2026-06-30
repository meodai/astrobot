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
