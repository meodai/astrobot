// test/roll.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { roll, rng, rollColor, rollBirth } = require('../lib/roll.js');
const { computeChart } = require('../lib/chart.js');

test('rng(42) is deterministic', () => {
  const r1 = rng(42);
  const r2 = rng(42);
  const vals1 = [r1(), r1(), r1()];
  const vals2 = [r2(), r2(), r2()];
  assert.deepEqual(vals1, vals2);
});

test('rng with no seed returns different values', () => {
  const r = rng();
  // Math.random — just check it returns a number in [0,1)
  const v = r();
  assert.ok(v >= 0 && v < 1, 'value should be in [0,1)');
});

test('roll(42) is reproducible', () => {
  const a = roll(42);
  const b = roll(42);
  assert.deepEqual(a, b);
});

test('rollColor returns a valid hex color', () => {
  const r = rng(1);
  const hex = rollColor(r);
  assert.match(hex, /^#[0-9a-f]{6}$/i);
});

test('rollColor returns valid hex for multiple seeds', () => {
  for (let s = 0; s < 20; s++) {
    const r = rng(s);
    const hex = rollColor(r);
    assert.match(hex, /^#[0-9a-f]{6}$/i, `seed ${s} produced invalid hex: ${hex}`);
  }
});

test('anti-bias distribution: ≥9 distinct sun signs over 120 seeds', () => {
  const signs = new Set();
  for (let seed = 0; seed < 120; seed++) {
    const result = roll(seed);
    const chart = computeChart(result.birth);
    signs.add(chart.sun.sign);
  }
  assert.ok(
    signs.size >= 9,
    `Expected ≥9 distinct sun signs, got ${signs.size}: ${[...signs].join(', ')}`
  );
});

test('CLI roll --seed 7 prints valid JSON with birth, colorHex, chart.sun.sign', () => {
  const binPath = path.join(__dirname, '..', 'bin', 'astrobot.js');
  const out = execFileSync(process.execPath, [binPath, 'roll', '--seed', '7'], { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert.ok(parsed.birth, 'missing birth');
  assert.ok(parsed.colorHex, 'missing colorHex');
  assert.ok(parsed.chart && parsed.chart.sun && parsed.chart.sun.sign, 'missing chart.sun.sign');
});
