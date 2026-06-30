// test/places.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveCoords, DEFAULT_COORDS } = require('../lib/places.js');

test('explicit finite coords pass through unchanged', () => {
  const result = resolveCoords({ lat: 48.85, lon: 2.35, place: 'Paris' });
  assert.strictEqual(result.lat, 48.85);
  assert.strictEqual(result.lon, 2.35);
});

test('{place:"London"} resolves to London coords from cities.json', () => {
  const result = resolveCoords({ place: 'London' });
  assert.ok(Number.isFinite(result.lat), 'lat is finite');
  assert.ok(Number.isFinite(result.lon), 'lon is finite');
  // London is ~51.5 N, ~-0.1 E
  assert.ok(result.lat > 51 && result.lat < 52, `lat ${result.lat} should be near London`);
  assert.ok(result.lon > -1 && result.lon < 1, `lon ${result.lon} should be near London`);
});

test('{place:"Reykjavík, Iceland"} resolves via city-only path', () => {
  const result = resolveCoords({ place: 'Reykjavík, Iceland' });
  assert.ok(Number.isFinite(result.lat), 'lat is finite');
  assert.ok(Number.isFinite(result.lon), 'lon is finite');
  // Reykjavík is ~64.1 N
  assert.ok(result.lat > 63 && result.lat < 65, `lat ${result.lat} should be near Reykjavík`);
});

test('{place:"Nowhereville"} resolves to DEFAULT_COORDS', () => {
  const result = resolveCoords({ place: 'Nowhereville' });
  assert.strictEqual(result.lat, DEFAULT_COORDS.lat);
  assert.strictEqual(result.lon, DEFAULT_COORDS.lon);
});

test('{} (empty birth) resolves to DEFAULT_COORDS', () => {
  const result = resolveCoords({});
  assert.strictEqual(result.lat, DEFAULT_COORDS.lat);
  assert.strictEqual(result.lon, DEFAULT_COORDS.lon);
});
