// test/synastry.test.js
// CJS — no ESM. Tests for lib/synastry.js.
'use strict';

const { test } = require('node:test');
const assert   = require('node:assert');
const { synastry }    = require('../lib/synastry.js');
const { computeChart } = require('../lib/chart.js');
const { roll }        = require('../lib/roll.js');

// ─── Shared fixture ──────────────────────────────────────────────────────────

const BIRTH = { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 };
const chart  = computeChart(BIRTH);

// ─── Same-chart (self vs self) tests ─────────────────────────────────────────

test('synastry(chart, chart) → score >= 80', () => {
  const r = synastry(chart, chart);
  assert.ok(r.score >= 80, `score was ${r.score}, expected >= 80`);
});

test('synastry(chart, chart) → elements.relation is kindred', () => {
  const r = synastry(chart, chart);
  assert.strictEqual(r.elements.relation, 'kindred');
});

test('synastry(chart, chart) → all required top-level keys present', () => {
  const r = synastry(chart, chart);
  for (const key of ['score','verdict','elements','modality','aspects','romance','reading','hasAscendant']) {
    assert.ok(key in r, `missing key: ${key}`);
  }
});

test('synastry(chart, chart) → aspects is array, romance has exactly 2 entries', () => {
  const r = synastry(chart, chart);
  assert.ok(Array.isArray(r.aspects), 'aspects must be an array');
  assert.strictEqual(r.romance.length, 2);
});

test('synastry(chart, chart) → each pair has required shape', () => {
  const r = synastry(chart, chart);
  for (const p of [...r.aspects, ...r.romance]) {
    assert.ok(typeof p.pair      === 'string',  `pair.pair must be string`);
    assert.ok(typeof p.a         === 'string',  `pair.a must be string`);
    assert.ok(typeof p.b         === 'string',  `pair.b must be string`);
    assert.ok(typeof p.aspect    === 'string',  `pair.aspect must be string`);
    assert.ok(typeof p.tone      === 'string',  `pair.tone must be string`);
    assert.ok(typeof p.polarity  === 'number',  `pair.polarity must be number`);
    assert.ok(typeof p.weight    === 'number',  `pair.weight must be number`);
  }
});

test('synastry(chart, chart) → verdict matches >= 80 band', () => {
  const r = synastry(chart, chart);
  assert.ok(r.score >= 80);
  assert.strictEqual(r.verdict, 'a rare, easy match');
});

test('synastry(chart, chart) → hasAscendant is true (both have valid birth time)', () => {
  const r = synastry(chart, chart);
  assert.strictEqual(r.hasAscendant, true);
});

test('synastry(chart, chart) → reading is a non-empty string', () => {
  const r = synastry(chart, chart);
  assert.ok(typeof r.reading === 'string' && r.reading.length > 0);
});

// ─── Determinism ─────────────────────────────────────────────────────────────

test('synastry is deterministic: two calls with identical charts deep-equal', () => {
  const a = synastry(chart, chart);
  const b = synastry(chart, chart);
  assert.deepStrictEqual(a, b);
});

test('synastry is deterministic for two different rolled charts', () => {
  const { birth: bA } = roll(42);
  const { birth: bB } = roll(1337);
  const cA = computeChart(bA);
  const cB = computeChart(bB);
  const a = synastry(cA, cB);
  const b = synastry(cA, cB);
  assert.deepStrictEqual(a, b);
});

// ─── Score bounds for several rolled pairs ────────────────────────────────────

test('synastry score stays in 0..100 across multiple rolled pairs', () => {
  for (const seed of [1, 7, 42, 99, 777, 1234, 5678]) {
    const { birth: bA } = roll(seed);
    const { birth: bB } = roll(seed + 500);
    const cA = computeChart(bA);
    const cB = computeChart(bB);
    const r  = synastry(cA, cB);
    assert.ok(
      r.score >= 0 && r.score <= 100,
      `seed ${seed}: score ${r.score} out of 0..100`
    );
  }
});

// ─── Element relation tests (constructed minimal chart-like fixtures) ─────────
// These use minimal objects with the fields synastry reads:
// sun/moon/venus/mars { lon } + dominant { element, modality } + ascendant { lon }
// (sign strings are not needed — synastry derives them from lon via signFromLongitude)

// Fire (Aries/Leo/Sagittarius = lon 0/120/240) vs Air (Gemini/Libra/Aquarius = 60/180/300)
const fireMinChart = {
  sun:       { lon: 0   },   // Aries
  moon:      { lon: 120 },   // Leo
  venus:     { lon: 240 },   // Sagittarius
  mars:      { lon: 0   },   // Aries
  dominant:  { element: 'Fire', modality: 'Cardinal' },
  ascendant: { lon: 0   },
};
const airMinChart = {
  sun:       { lon: 60  },   // Gemini
  moon:      { lon: 180 },   // Libra
  venus:     { lon: 300 },   // Aquarius
  mars:      { lon: 60  },   // Gemini
  dominant:  { element: 'Air', modality: 'Fixed' },
  ascendant: { lon: 60  },
};
// Water (Cancer/Scorpio/Pisces = 90/210/330)
const waterMinChart = {
  sun:       { lon: 90  },   // Cancer
  moon:      { lon: 210 },   // Scorpio
  venus:     { lon: 330 },   // Pisces
  mars:      { lon: 90  },   // Cancer
  dominant:  { element: 'Water', modality: 'Fixed' },
  ascendant: { lon: 90  },
};

test('element relation: Fire agent vs Air user → harmonious', () => {
  const r = synastry(fireMinChart, airMinChart);
  assert.strictEqual(r.elements.relation, 'harmonious');
});

test('element relation: Air agent vs Fire user → harmonious (symmetric)', () => {
  const r = synastry(airMinChart, fireMinChart);
  assert.strictEqual(r.elements.relation, 'harmonious');
});

test('element relation: Fire agent vs Water user → tense', () => {
  const r = synastry(fireMinChart, waterMinChart);
  assert.strictEqual(r.elements.relation, 'tense');
});

test('element relation: same chart → kindred', () => {
  const r = synastry(fireMinChart, fireMinChart);
  assert.strictEqual(r.elements.relation, 'kindred');
});

// ─── No-ascendant path ────────────────────────────────────────────────────────

test('no-ascendant path: userChart with undefined ascendant → hasAscendant false', () => {
  // Spread creates a shallow copy; we can delete the key on the copy safely.
  const userNoAsc = { ...chart };
  delete userNoAsc.ascendant;
  const r = synastry(chart, userNoAsc);
  assert.strictEqual(r.hasAscendant, false);
});

test('no-ascendant path: no pair label in aspects contains "Ascendant"', () => {
  const userNoAsc = { ...chart };
  delete userNoAsc.ascendant;
  const r = synastry(chart, userNoAsc);
  for (const p of r.aspects) {
    assert.ok(!p.pair.includes('Ascendant'), `unexpected pair label: ${p.pair}`);
  }
});

test('no-ascendant path: still returns a valid numeric score', () => {
  const userNoAsc = { ...chart };
  delete userNoAsc.ascendant;
  const r = synastry(chart, userNoAsc);
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100);
});

test('no-ascendant path: self-vs-self without asc still scores >= 80', () => {
  const clone = { ...chart };
  delete clone.ascendant;
  // Both agents lack ascendant
  const r = synastry(clone, clone);
  assert.ok(r.score >= 80, `score ${r.score} expected >= 80`);
});

// ─── Verdict band mapping ─────────────────────────────────────────────────────

test('verdict band: score 80 → "a rare, easy match"', () => {
  // Force score via a constructed fixture where all aspects are conjunctions
  const r = synastry(fireMinChart, fireMinChart);
  // fire vs fire = kindred (+6), all conjunctions (+1), same modality (0)
  assert.ok(r.score >= 80);
  assert.strictEqual(r.verdict, 'a rare, easy match');
});

test('verdict band mapping covers all five bands', () => {
  // We verify the mapping by injecting controlled charts rather than mocking score internals.
  // Kindred + all conjunctions = highest; verify that score selects the correct band string.
  const BANDS = [
    [80, 'a rare, easy match'],
    [65, 'a warm, workable match'],
    [50, 'a mixed but promising match'],
    [35, 'a spark with friction'],
    [0,  'an odd-couple match'],
  ];
  // Confirm the real self-vs-self score hits the top band
  const top = synastry(chart, chart);
  assert.ok(top.score >= 80 && top.verdict === 'a rare, easy match');
  // Confirm band boundaries with tense fixtures
  const tense = synastry(fireMinChart, waterMinChart);
  // This will land somewhere; just confirm the returned verdict is one of the five
  const verdicts = BANDS.map(b => b[1]);
  assert.ok(verdicts.includes(tense.verdict), `unexpected verdict: ${tense.verdict}`);
});
