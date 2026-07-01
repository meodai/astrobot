// test/timezone.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveOffset, offsetMinutesFromZone, fmtOffset } = require('../lib/timezone.js');
const { nearestCity } = require('../lib/geocode.js');

test('single-zone country resolves to its representative zone and offset', () => {
  const r = resolveOffset('CH', '1982-11-16T13:00:00');
  assert.strictEqual(r.zone, 'Europe/Zurich');
  assert.strictEqual(r.offsetMinutes, 60);
});

test('DST is applied for summer births in the DST era', () => {
  const r = resolveOffset('CH', '1982-07-16T13:00:00');
  assert.strictEqual(r.offsetMinutes, 120);
});

test('history is honored: Switzerland had no DST in 1975', () => {
  const r = resolveOffset('CH', '1975-07-16T13:00:00');
  assert.strictEqual(r.offsetMinutes, 60);
});

test('multi-zone countries report multiZone instead of guessing', () => {
  assert.deepStrictEqual(resolveOffset('US', '1990-01-01T12:00:00'), { multiZone: true });
  assert.deepStrictEqual(resolveOffset('RU', '1990-01-01T12:00:00'), { multiZone: true });
});

test('unknown or missing country code returns null', () => {
  assert.strictEqual(resolveOffset('ZZ', '1990-01-01T12:00:00'), null);
  assert.strictEqual(resolveOffset(null, '1990-01-01T12:00:00'), null);
});

test('unparseable datetime returns null', () => {
  assert.strictEqual(resolveOffset('CH', 'not-a-date'), null);
});

test('India half-hour offset is formatted correctly', () => {
  const r = resolveOffset('IN', '1990-01-01T12:00:00');
  assert.strictEqual(r.offsetMinutes, 330);
  assert.strictEqual(fmtOffset(r.offsetMinutes), '+05:30');
});

test('offsetMinutesFromZone handles a bare-GMT zone as zero', () => {
  assert.strictEqual(offsetMinutesFromZone('UTC', new Date('2000-01-01T00:00:00Z')), 0);
});

test('fmtOffset renders sign, hours, and minutes', () => {
  assert.strictEqual(fmtOffset(60), '+01:00');
  assert.strictEqual(fmtOffset(-300), '-05:00');
  assert.strictEqual(fmtOffset(0), '+00:00');
});

test('nearestCity infers the correct country from coordinates', () => {
  // Fribourg, Switzerland — not itself in the dataset, nearest city is Swiss.
  const near = nearestCity(46.80, 7.15);
  assert.strictEqual(near.cc, 'CH');
});
