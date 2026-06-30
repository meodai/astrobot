// test/houses.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { HOUSE_MEANINGS, houseOf } = require('../lib/houses.js');

test('houseOf returns 1 when planet and ascendant share the same sign index', () => {
  for (let i = 0; i < 12; i++) {
    assert.strictEqual(houseOf(i, i), 1, `sign index ${i} should be house 1 when same as asc`);
  }
});

test('houseOf wraps correctly mod 12 (ascIndex=7, planetIndex=9 -> house 3)', () => {
  assert.strictEqual(houseOf(9, 7), 3);
});

test('houseOf returns values between 1 and 12 inclusive for all combinations', () => {
  for (let asc = 0; asc < 12; asc++) {
    for (let planet = 0; planet < 12; planet++) {
      const h = houseOf(planet, asc);
      assert.ok(h >= 1 && h <= 12, `houseOf(${planet}, ${asc}) = ${h} out of range`);
    }
  }
});

test('houseOf handles the wrap-around case (asc=11, planet=0 -> house 2)', () => {
  assert.strictEqual(houseOf(0, 11), 2);
});

test('HOUSE_MEANINGS has entries for all 12 houses', () => {
  for (let i = 1; i <= 12; i++) {
    assert.ok(typeof HOUSE_MEANINGS[i] === 'string' && HOUSE_MEANINGS[i].length > 0,
      `HOUSE_MEANINGS[${i}] should be a non-empty string`);
  }
});

test('HOUSE_MEANINGS has correct content for select houses', () => {
  assert.strictEqual(HOUSE_MEANINGS[1], 'self & identity');
  assert.strictEqual(HOUSE_MEANINGS[10], 'vocation & public life');
  assert.strictEqual(HOUSE_MEANINGS[12], 'inner life & retreat');
});
