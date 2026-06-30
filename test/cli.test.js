// test/cli.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-cli-'));
  process.env.ASTROBOT_DIR = tmp;
  for (const m of ['../bin/astrobot.js','../lib/profile.js','../lib/paths.js']) {
    delete require.cache[require.resolve(m)];
  }
});

const BIRTH_JSON = JSON.stringify({
  birth: { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 },
  color: { name: 'Deep Teal', hex: '#0E6B6B' },
  persona: 'A grounded Capricorn.',
  traits: ['steady', 'dry-humored'],
});

test('today prints nothing when no profile exists', async () => {
  const { run } = require('../bin/astrobot.js');
  const r = await run(['today', '--model', 'claude-x'], { stdin: '' });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.out.trim(), '');
});

test('birth saves a profile, then today emits a context block', async () => {
  const { run } = require('../bin/astrobot.js');
  const b = await run(['birth', '--model', 'claude-x'], { stdin: BIRTH_JSON });
  assert.strictEqual(b.code, 0);
  assert.match(b.out, /Capricorn/);

  const t = await run(['today', '--model', 'claude-x'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
  assert.match(t.out, /Deep Teal/);
});

test('today falls back to _default when model omitted', async () => {
  const { run } = require('../bin/astrobot.js');
  await run(['birth', '--model', 'claude-x'], { stdin: BIRTH_JSON });
  const t = await run(['today'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
});
