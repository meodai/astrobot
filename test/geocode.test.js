// test/geocode.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { geocode } = require('../lib/geocode.js');

test('geocode: exact match returns correct city object', () => {
  const r = geocode('Lisbon');
  assert.ok(r, 'should find Lisbon');
  assert.strictEqual(r.cc, 'PT');
  assert.strictEqual(r.name, 'Lisbon');
  assert.ok(Number.isFinite(r.lat), 'lat should be a finite number');
  assert.ok(Number.isFinite(r.lon), 'lon should be a finite number');
});

test('geocode: case-insensitive exact match', () => {
  const r = geocode('lisbon');
  assert.ok(r);
  assert.strictEqual(r.cc, 'PT');
});

test('geocode: "City, CC" format matches by city and country code', () => {
  const r = geocode('lisbon, pt');
  assert.ok(r, 'should find lisbon via "city, cc" format');
  assert.strictEqual(r.cc, 'PT');
});

test('geocode: "City, CC" wrong CC returns null', () => {
  const r = geocode('lisbon, de');
  assert.strictEqual(r, null, 'wrong CC should return null');
});

test('geocode: startsWith match finds a city', () => {
  const r = geocode('Lond');
  assert.ok(r, 'should match a city starting with Lond');
  assert.match(r.name, /^Lond/i);
});

test('geocode: miss returns null', () => {
  const r = geocode('Zzzznotacity');
  assert.strictEqual(r, null);
});

test('geocode: empty string returns null', () => {
  assert.strictEqual(geocode(''), null);
});

test('geocode: null returns null', () => {
  assert.strictEqual(geocode(null), null);
});

test('geocode: undefined returns null', () => {
  assert.strictEqual(geocode(undefined), null);
});

test('geocode: population-sorted — most populous city wins on includes match', () => {
  // "London" is higher in the population-sorted list than smaller "London"s
  const r = geocode('London');
  assert.ok(r, 'should find London');
  assert.strictEqual(r.cc, 'GB');
});
