// test/zodiac.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SIGNS, signFromLongitude, decanOf, norm360 } = require('../lib/zodiac.js');

test('there are 12 signs in zodiac order with rulers', () => {
  assert.strictEqual(SIGNS.length, 12);
  assert.strictEqual(SIGNS[0].name, 'Aries');
  assert.strictEqual(SIGNS[0].ruler, 'Mars');
  assert.strictEqual(SIGNS[11].name, 'Pisces');
  assert.strictEqual(SIGNS[7].name, 'Scorpio');
  assert.strictEqual(SIGNS[7].ruler, 'Mars');
  assert.strictEqual(SIGNS[10].ruler, 'Saturn'); // Aquarius traditional
});

test('signFromLongitude buckets every 30 degrees', () => {
  assert.strictEqual(signFromLongitude(0).name, 'Aries');
  assert.strictEqual(signFromLongitude(29.999).name, 'Aries');
  assert.strictEqual(signFromLongitude(30).name, 'Taurus');
  assert.strictEqual(signFromLongitude(210).name, 'Scorpio');
  assert.strictEqual(signFromLongitude(359.5).name, 'Pisces');
  assert.strictEqual(signFromLongitude(0).index, 0);
});

test('signFromLongitude normalizes out-of-range input', () => {
  assert.strictEqual(signFromLongitude(360).name, 'Aries');
  assert.strictEqual(signFromLongitude(-1).name, 'Pisces');
});

test('decanOf returns the 10-degree third', () => {
  assert.strictEqual(decanOf(0), 0);
  assert.strictEqual(decanOf(9.99), 0);
  assert.strictEqual(decanOf(10), 1);
  assert.strictEqual(decanOf(25), 2);
  assert.strictEqual(decanOf(35), 0); // 5 deg into Taurus
});

test('norm360 wraps correctly', () => {
  assert.strictEqual(norm360(370), 10);
  assert.strictEqual(norm360(-10), 350);
  assert.strictEqual(norm360(0), 0);
});
