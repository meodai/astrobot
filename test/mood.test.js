// test/mood.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { composeMood, phaseName, phaseEnergy } = require('../lib/mood.js');

const CHART = {
  sun: { sign: 'Capricorn', lon: 280, decan: 0 },
  ruler: 'Saturn',
  dominant: { element: 'Earth', modality: 'Cardinal' },
};
const D = new Date('2024-07-01T12:00:00Z');

test('phaseName covers the 8 buckets', () => {
  assert.strictEqual(phaseName(0), 'new');
  assert.strictEqual(phaseName(90), 'first quarter');
  assert.strictEqual(phaseName(180), 'full');
  assert.strictEqual(phaseName(270), 'last quarter');
  assert.strictEqual(phaseName(45), 'waxing crescent');
  assert.strictEqual(phaseName(315), 'waning crescent');
});

test('phaseEnergy maps phases to a coarse energy', () => {
  assert.strictEqual(phaseEnergy('new'), 'inward');
  assert.strictEqual(phaseEnergy('full'), 'expressive');
});

test('dials are integers clamped 0..4', () => {
  const m = composeMood(CHART, D);
  for (const k of ['warmth','energy','playfulness','verbosity','metaphor']) {
    assert.ok(Number.isInteger(m.dials[k]), `${k} integer`);
    assert.ok(m.dials[k] >= 0 && m.dials[k] <= 4, `${k} in 0..4, got ${m.dials[k]}`);
  }
});

test('composeMood is deterministic for the same chart and date', () => {
  assert.deepStrictEqual(composeMood(CHART, D), composeMood(CHART, D));
});

test('sun in its own season raises energy vs opposition', () => {
  const homeDate = new Date('2025-01-05T12:00:00Z'); // Sun in Capricorn (own sun sign)
  const oppDate  = new Date('2024-07-05T12:00:00Z'); // Sun in Cancer (opposite)
  const home = composeMood(CHART, homeDate);
  const opp  = composeMood(CHART, oppDate);
  assert.strictEqual(home.sunAspect, 'conjunction');
  assert.strictEqual(opp.sunAspect, 'opposition');
  assert.ok(home.dials.energy >= opp.dials.energy);
});

// Color integration tests
test('warm-vivid color raises warmth & playfulness vs cool-muted color', () => {
  const warmVivid = composeMood(CHART, D, '#ff5a1f'); // warm orange, vivid
  const coolMuted = composeMood(CHART, D, '#b0c0c8'); // cool gray-blue, muted, Moon-nearest
  assert.ok(
    warmVivid.dials.warmth > coolMuted.dials.warmth,
    `warmVivid warmth ${warmVivid.dials.warmth} should exceed coolMuted ${coolMuted.dials.warmth}`,
  );
  assert.ok(
    warmVivid.dials.playfulness > coolMuted.dials.playfulness,
    `warmVivid playfulness ${warmVivid.dials.playfulness} should exceed coolMuted ${coolMuted.dials.playfulness}`,
  );
});

test('composeMood without colorHex matches prior behavior (backward compat)', () => {
  const noColor = composeMood(CHART, D);
  const withUndefined = composeMood(CHART, D, undefined);
  assert.deepStrictEqual(noColor, withUndefined);
});

test('composeMood with colorHex is deterministic', () => {
  const a = composeMood(CHART, D, '#ff5a1f');
  const b = composeMood(CHART, D, '#ff5a1f');
  assert.deepStrictEqual(a, b);
});
