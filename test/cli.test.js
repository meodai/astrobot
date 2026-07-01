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
  color: { hex: '#0E6B6B' },
  persona: 'A grounded Capricorn.',
  traits: ['steady', 'dry-humored'],
});
// The color name is now auto-derived by colorName('#0E6B6B'). Compute it here for assertions.
const { colorName } = require('../lib/colorname.js');
const DERIVED_COLOR_NAME = colorName('#0E6B6B');

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
  // Color name is auto-derived; must not be "undefined" and must be non-empty.
  assert.ok(!b.out.includes('undefined'), 'birth output should not contain undefined');
  assert.ok(b.out.includes(DERIVED_COLOR_NAME), 'birth output should include derived color name: ' + DERIVED_COLOR_NAME);

  const t = await run(['today', '--model', 'claude-x'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
  assert.ok(t.out.includes(DERIVED_COLOR_NAME), 'today output should include derived color name: ' + DERIVED_COLOR_NAME);
});

test('today falls back to _default when model omitted', async () => {
  const { run } = require('../bin/astrobot.js');
  await run(['birth', '--model', 'claude-x'], { stdin: BIRTH_JSON });
  const t = await run(['today'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
});

test('birth with JSON missing color returns code 1 and does not throw', async () => {
  const { run } = require('../bin/astrobot.js');
  const bad = JSON.stringify({
    birth: { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 },
  });
  const r = await run(['birth', '--model', 'x'], { stdin: bad });
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /requires birth and color/);
});

test('birth with color.hex but no color.name auto-derives the name', async () => {
  const { run } = require('../bin/astrobot.js');
  const input = JSON.stringify({
    birth: { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 },
    color: { hex: '#0E6B6B' },
    persona: 'A test persona.',
    traits: ['test'],
  });
  const r = await run(['birth', '--model', 'auto-name-test'], { stdin: input });
  assert.strictEqual(r.code, 0);
  assert.ok(!r.out.includes('undefined'), 'output should not contain undefined');
  assert.ok(r.out.includes(DERIVED_COLOR_NAME), 'output should include derived name: ' + DERIVED_COLOR_NAME);
});

test('export prints a portable block for a born model, nothing-ish when absent', async () => {
  const { run } = require('../bin/astrobot.js');
  const none = await run(['export', '--model', 'x'], { stdin: '' });
  assert.match(none.out, /No astrobot identity yet/);
  await run(['birth', '--model', 'x'], { stdin: BIRTH_JSON });
  const got = await run(['export', '--model', 'x'], { stdin: '' });
  assert.ok(!got.out.includes('[astrobot]'));
  assert.match(got.out, /tone only/i);
});

test('birth with place but no lat/lon resolves coords and stores a valid chart', async () => {
  const { run } = require('../bin/astrobot.js');
  const input = JSON.stringify({
    birth: { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, place: 'London' },
    color: { hex: '#6A5ACD' },
  });
  const b = await run(['birth', '--model', 'place-test'], { stdin: input });
  assert.strictEqual(b.code, 0, 'birth should succeed: ' + b.out);
  // chart.ascendant.sign must be a real sign string, not 'undefined'
  assert.ok(!b.out.includes('undefined'), 'output should not contain undefined');

  // Verify stored profile via show command
  const s = await run(['show', '--model', 'place-test'], { stdin: '' });
  assert.ok(!s.out.includes('undefined'), 'show output should not contain undefined');
  assert.match(s.out, /rising/, 'show output should include a rising sign');
});

test('non-birth commands resolve without reading stdin (regression: no hang)', async () => {
  // Called WITHOUT an injected opts.stdin. Under the old code these awaited
  // readAllStdin(), which never resolves in a non-TTY test runner — a hang.
  const { run } = require('../bin/astrobot.js');
  const bp = await run(['birth-prompt', '--seed', '7']);
  assert.match(bp.out, /birth card/);
  const t = await run(['today', '--model', 'nobody-here']);
  assert.strictEqual(t.out, '');
});
