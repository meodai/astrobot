// test/mcp-tools.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Isolate the store in a temp dir and pin the model key BEFORE requiring the module.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-mcp-'));
process.env.ASTROBOT_DIR = TMP;
process.env.ASTROBOT_MODEL = 'test-mcp';

const tools = require('../lib/mcp-tools.js');

function textOf(res) {
  return res.content.map((c) => c.text).join('\n');
}

beforeEach(() => {
  // Fresh store each test.
  try { fs.rmSync(path.join(TMP, 'profiles.json')); } catch {}
});

test('modelKey uses ASTROBOT_MODEL', () => {
  assert.strictEqual(tools.modelKey(), 'test-mcp');
});

test('persona before birth returns guidance, not an error', async () => {
  const res = await tools.personaTool();
  assert.ok(!res.isError);
  assert.match(textOf(res), /no astrobot identity/i);
});

test('birth phase 1 returns a chart + seed and persists nothing', async () => {
  const res = await tools.birthTool({ seed: 42 });
  assert.ok(!res.isError);
  const data = JSON.parse(textOf(res));
  assert.strictEqual(data.seed, 42);
  assert.ok(data.chart && data.chart.sun);
  // Still no identity stored.
  const after = await tools.personaTool();
  assert.match(textOf(after), /no astrobot identity/i);
});

test('birth phase 1 is reproducible for a given seed', async () => {
  const a = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  const b = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  assert.strictEqual(a.chart.sun, b.chart.sun);
  assert.strictEqual(a.chart.rising, b.chart.rising);
  assert.strictEqual(a.colorHex, b.colorHex);
});

test('birth phase 2 persists; persona then names the identity', async () => {
  const rolled = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  const born = await tools.birthTool({ seed: 7, persona: 'A tidy test persona.', traits: ['calm'] });
  assert.ok(!born.isError, textOf(born));
  const persona = await tools.personaTool();
  assert.ok(!persona.isError);
  assert.match(textOf(persona), new RegExp(rolled.chart.sun, 'i'));
});

test('birth phase 2 without a seed is an error', async () => {
  const res = await tools.birthTool({ persona: 'no seed here' });
  assert.ok(res.isError);
  assert.match(textOf(res), /seed/i);
});

test('set_companion records a birth and persona gains a Companion line', async () => {
  await tools.birthTool({ seed: 7, persona: 'A tidy test persona.', traits: ['calm'] });
  const comp = await tools.setCompanionTool({ datetime: '1982-11-16T13:00:00', lat: 46.80, lon: 7.15 });
  assert.ok(!comp.isError, textOf(comp));
  assert.match(textOf(comp), /Europe\/Zurich/);
  const persona = await tools.personaTool();
  assert.match(textOf(persona), /companion/i);
});

test('set_companion for a multi-zone country without offset errors', async () => {
  const res = await tools.setCompanionTool({ datetime: '1990-01-01T12:00:00', place: 'Chicago' });
  assert.ok(res.isError);
  assert.match(textOf(res), /time zones/i);
});
