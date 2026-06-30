// test/ephemeris.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { BODIES, eclipticLongitudeOf, moonPhaseAngle, gastHours } = require('../lib/ephemeris.js');

const D = new Date('2000-01-01T12:00:00Z'); // J2000-ish reference

test('every body returns a longitude in [0,360)', () => {
  for (const body of BODIES) {
    const lon = eclipticLongitudeOf(body, D);
    assert.ok(Number.isFinite(lon), `${body} finite`);
    assert.ok(lon >= 0 && lon < 360, `${body} in range, got ${lon}`);
  }
});

test('Sun near J2000 sits in Capricorn (~280 deg)', () => {
  const lon = eclipticLongitudeOf('Sun', D);
  assert.ok(lon > 270 && lon < 290, `expected ~280, got ${lon}`);
});

test('moonPhaseAngle is in [0,360)', () => {
  const p = moonPhaseAngle(D);
  assert.ok(p >= 0 && p < 360, `got ${p}`);
});

test('gastHours is in [0,24)', () => {
  const h = gastHours(D);
  assert.ok(h >= 0 && h < 24, `got ${h}`);
});
