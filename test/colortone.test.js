// test/colortone.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { hexToHsl, colorTone, colorLore, nearestPlanet } = require('../lib/colortone.js');

// hexToHsl
test('hexToHsl #ff0000 → h=0, s=100, l=50', () => {
  const h = hexToHsl('#ff0000');
  assert.ok(h, 'returns non-null');
  assert.ok(Math.abs(h.h - 0) < 1, `h≈0, got ${h.h}`);
  assert.ok(Math.abs(h.s - 100) < 1, `s≈100, got ${h.s}`);
  assert.ok(Math.abs(h.l - 50) < 1, `l≈50, got ${h.l}`);
});

test('hexToHsl #808080 → s=0 (achromatic)', () => {
  const h = hexToHsl('#808080');
  assert.ok(h, 'returns non-null');
  assert.ok(Math.abs(h.s) < 1, `s≈0, got ${h.s}`);
});

test('hexToHsl returns null for bad input', () => {
  assert.strictEqual(hexToHsl(null), null);
  assert.strictEqual(hexToHsl('not-a-color'), null);
  assert.strictEqual(hexToHsl('#fff'), null); // 3-digit not supported
});

// colorTone
test('colorTone #ff5a1f is warm+vivid → warmth>0, playfulness>0', () => {
  const d = colorTone('#ff5a1f');
  assert.ok((d.warmth || 0) > 0, `warmth should be >0, got ${d.warmth}`);
  assert.ok((d.playfulness || 0) > 0, `playfulness should be >0, got ${d.playfulness}`);
});

test('colorLore #b0c0c8 is cool+muted on hue/sat axes', () => {
  // #b0c0c8 — cool gray-blue (~200° hue, ~18% sat), nearest to Moon (metaphor+1, no warmth).
  const lore = colorLore('#b0c0c8');
  assert.strictEqual(lore.warmCool, 'cool');
  assert.strictEqual(lore.vividMuted, 'muted');
});

test('colorTone #b0c0c8 (cool+muted, Moon-nearest) → warmth<0, playfulness<0', () => {
  // Cool hue → warmth -1; muted sat → playfulness -1; Moon nudge → metaphor +1 (no warmth offset).
  const d = colorTone('#b0c0c8');
  assert.ok((d.warmth || 0) < 0, `warmth should be <0, got ${d.warmth}`);
  assert.ok((d.playfulness || 0) < 0, `playfulness should be <0, got ${d.playfulness}`);
});

test('colorLore #3aa34c (green hue) is warm-cool balanced', () => {
  // Pure green sits between warm and cool on the hue axis.
  // colorLore.warmCool captures only the hue component.
  const lore = colorLore('#3aa34c');
  assert.strictEqual(lore.warmCool, 'balanced');
});

test('colorTone bad input → {}', () => {
  assert.deepStrictEqual(colorTone(null), {});
  assert.deepStrictEqual(colorTone('invalid'), {});
});

// nearestPlanet
test('nearestPlanet #c0392b === Mercury (exact anchor)', () => {
  assert.strictEqual(nearestPlanet('#c0392b'), 'Mercury');
});

test('nearestPlanet #2e8b57 === Venus (exact anchor)', () => {
  assert.strictEqual(nearestPlanet('#2e8b57'), 'Venus');
});

// colorLore spot-checks
test('colorLore #ff0000 → warmCool:warm, chakra root, theosophy courage', () => {
  const lore = colorLore('#ff0000');
  assert.ok(lore, 'returns non-null');
  assert.strictEqual(lore.warmCool, 'warm');
  assert.ok(lore.vividMuted, 'has vividMuted');
  assert.ok(lore.planet, 'has planet');
  assert.strictEqual(lore.chakra.name, 'root');
  assert.strictEqual(lore.theosophy, 'courage');
});

test('colorLore #3344aa → chakra throat, theosophy devotion', () => {
  const lore = colorLore('#3344aa');
  assert.ok(lore, 'returns non-null');
  assert.strictEqual(lore.chakra.name, 'throat');
  assert.strictEqual(lore.theosophy, 'devotion');
});

test('colorLore has all required keys', () => {
  const lore = colorLore('#e6c200');
  assert.ok(lore, 'returns non-null');
  assert.ok('warmCool' in lore, 'warmCool');
  assert.ok('vividMuted' in lore, 'vividMuted');
  assert.ok('planet' in lore, 'planet');
  assert.ok('chakra' in lore && 'name' in lore.chakra && 'theme' in lore.chakra, 'chakra with name+theme');
  assert.ok('theosophy' in lore, 'theosophy');
});

test('colorLore returns null for bad input', () => {
  assert.strictEqual(colorLore(null), null);
  assert.strictEqual(colorLore('bad'), null);
});
