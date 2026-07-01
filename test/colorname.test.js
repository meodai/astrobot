// test/colorname.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { colorName } = require('../lib/colorname.js');

test('exact entry: #c93f38 → "100 Mph"', () => {
  assert.strictEqual(colorName('#c93f38'), '100 Mph');
});

test('exact entry: #bdb251 → "Vegas Gold"', () => {
  assert.strictEqual(colorName('#bdb251'), 'Vegas Gold');
});

test('exact entry: #35b0c0 → "Laguna"', () => {
  assert.strictEqual(colorName('#35b0c0'), 'Laguna');
});

test('near-but-not-exact hex returns a non-empty string', () => {
  // Slightly shifted from #bdb251 — should still find a near neighbor.
  const name = colorName('#bdb252');
  assert.ok(typeof name === 'string' && name.length > 0, 'expected non-empty name, got: ' + JSON.stringify(name));
});

test('bad input "nope" returns ""', () => {
  assert.strictEqual(colorName('nope'), '');
});

test('empty string returns ""', () => {
  assert.strictEqual(colorName(''), '');
});
