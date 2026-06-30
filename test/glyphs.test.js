// test/glyphs.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SIGN_GLYPHS, signGlyph, planetGlyph, aspectGlyph, moonPhaseGlyph } = require('../lib/glyphs.js');

test('every zodiac sign has a glyph', () => {
  const names = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  for (const n of names) assert.ok(SIGN_GLYPHS[n], `${n} should have a glyph`);
  assert.strictEqual(signGlyph('Scorpio'), '♏');
  assert.strictEqual(signGlyph('Aries'), '♈');
  assert.strictEqual(signGlyph('Pisces'), '♓');
});

test('planet, aspect and moon-phase glyphs resolve', () => {
  assert.strictEqual(planetGlyph('Mars'), '♂');
  assert.strictEqual(planetGlyph('Sun'), '☉');
  assert.strictEqual(planetGlyph('Moon'), '☽');
  assert.strictEqual(aspectGlyph('opposition'), '☍');
  assert.strictEqual(aspectGlyph('conjunction'), '☌');
  assert.strictEqual(aspectGlyph('trine'), '△');
  assert.strictEqual(moonPhaseGlyph('full'), '🌕');
  assert.strictEqual(moonPhaseGlyph('new'), '🌑');
});

test('unknown names return empty string, never undefined', () => {
  assert.strictEqual(signGlyph('Nope'), '');
  assert.strictEqual(planetGlyph('Pluto'), '');
  assert.strictEqual(aspectGlyph('biquintile'), '');
  assert.strictEqual(moonPhaseGlyph('gibbous'), '');
});
