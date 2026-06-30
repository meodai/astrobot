// test/aspects.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { aspectBetweenSigns } = require('../lib/aspects.js');

test('distance is the circular sign distance 0..6', () => {
  assert.strictEqual(aspectBetweenSigns(0, 0).distance, 0);
  assert.strictEqual(aspectBetweenSigns(0, 6).distance, 6);
  assert.strictEqual(aspectBetweenSigns(0, 11).distance, 1);
  assert.strictEqual(aspectBetweenSigns(1, 10).distance, 3);
});

test('each distance maps to the right aspect name', () => {
  assert.strictEqual(aspectBetweenSigns(0, 0).aspect, 'conjunction');
  assert.strictEqual(aspectBetweenSigns(0, 1).aspect, 'semisextile');
  assert.strictEqual(aspectBetweenSigns(0, 2).aspect, 'sextile');
  assert.strictEqual(aspectBetweenSigns(0, 3).aspect, 'square');
  assert.strictEqual(aspectBetweenSigns(0, 4).aspect, 'trine');
  assert.strictEqual(aspectBetweenSigns(0, 5).aspect, 'quincunx');
  assert.strictEqual(aspectBetweenSigns(0, 6).aspect, 'opposition');
});

test('aspect is symmetric', () => {
  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      assert.strictEqual(aspectBetweenSigns(a, b).aspect, aspectBetweenSigns(b, a).aspect);
    }
  }
});
