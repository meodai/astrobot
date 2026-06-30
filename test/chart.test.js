// test/chart.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { computeChart, ascendantLongitude } = require('../lib/chart.js');
const { houseOf } = require('../lib/houses.js');

const BIRTH = { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 }; // London-ish

test('chart has all seven bodies plus ascendant, each a valid sign', () => {
  const c = computeChart(BIRTH);
  for (const key of ['sun','moon','mercury','venus','mars','jupiter','saturn','ascendant']) {
    assert.ok(c[key], `${key} present`);
    assert.ok(typeof c[key].sign === 'string', `${key} has sign name`);
    assert.ok(c[key].lon >= 0 && c[key].lon < 360, `${key} lon in range`);
  }
});

test('sun sign is internally consistent with its longitude and has a decan', () => {
  const c = computeChart(BIRTH);
  assert.strictEqual(c.sun.sign, 'Capricorn'); // Sun ~280 deg at J2000
  assert.ok([0,1,2].includes(c.sun.decan));
  assert.strictEqual(c.ruler, 'Saturn'); // ruler of the sun sign
});

test('dominant element is one of the four', () => {
  const c = computeChart(BIRTH);
  assert.ok(['Fire','Earth','Air','Water'].includes(c.dominant.element));
  assert.ok(['Cardinal','Fixed','Mutable'].includes(c.dominant.modality));
});

test('ascendant longitude is deterministic and in range', () => {
  const a = ascendantLongitude(6, 51.5);
  assert.ok(a >= 0 && a < 360);
  assert.strictEqual(ascendantLongitude(6, 51.5), ascendantLongitude(6, 51.5));
});

test('computeChart is deterministic', () => {
  assert.deepStrictEqual(computeChart(BIRTH), computeChart(BIRTH));
});

test('ascendant sign matches verified reference for the London J2000 fixture', () => {
  // Verified by the controller via two independent methods (closed-form + numeric horizon).
  assert.strictEqual(computeChart(BIRTH).ascendant.sign, 'Aries');
});

test('computeChart throws when birth is missing lat/lon', () => {
  assert.throws(
    () => computeChart({ datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0 }),
    /requires numeric birth\.lat and birth\.lon/
  );
});

test('computeChart throws when birth has NaN lat', () => {
  assert.throws(
    () => computeChart({ datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: NaN, lon: 0 }),
    /requires numeric birth\.lat and birth\.lon/
  );
});

test('every chart placement has a house property in 1..12', () => {
  const c = computeChart(BIRTH);
  for (const key of ['sun','moon','mercury','venus','mars','jupiter','saturn','ascendant']) {
    assert.ok(Number.isInteger(c[key].house), `${key}.house should be an integer`);
    assert.ok(c[key].house >= 1 && c[key].house <= 12, `${key}.house should be 1..12, got ${c[key].house}`);
  }
});

test('ascendant.house is always 1 (whole-sign houses)', () => {
  const c = computeChart(BIRTH);
  assert.strictEqual(c.ascendant.house, 1);
});

test('sun.house is consistent with houseOf using the ascendant sign index', () => {
  const { signFromLongitude } = require('../lib/zodiac.js');
  const c = computeChart(BIRTH);
  const ascIndex = signFromLongitude(c.ascendant.lon).index;
  const sunIndex = signFromLongitude(c.sun.lon).index;
  assert.strictEqual(c.sun.house, houseOf(sunIndex, ascIndex));
});
