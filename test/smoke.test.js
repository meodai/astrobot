// test/smoke.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const astronomy = require('../vendor/astronomy.js');

test('vendored ephemeris exposes the functions we use', () => {
  for (const fn of ['SunPosition', 'EclipticGeoMoon', 'MoonPhase', 'GeoVector', 'Ecliptic', 'SiderealTime']) {
    assert.strictEqual(typeof astronomy[fn], 'function', `${fn} should be a function`);
  }
  assert.ok(astronomy.Body, 'Body enum should exist');
});
