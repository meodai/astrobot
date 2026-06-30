// test/tarot.test.js — CJS (no ESM import; project convention)
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { birthCard, decanCard, tarotFor, cardSlug, MAJOR_BY_SIGN } = require('../lib/tarot.js');

/* ---- birthCard: all 12 Major Arcana ------------------------------------ */

test('birthCard: all 12 sun-sign mappings (Golden Dawn / RWS)', () => {
  assert.strictEqual(birthCard('Aries'),       'The Emperor');
  assert.strictEqual(birthCard('Taurus'),      'The Hierophant');
  assert.strictEqual(birthCard('Gemini'),      'The Lovers');
  assert.strictEqual(birthCard('Cancer'),      'The Chariot');
  assert.strictEqual(birthCard('Leo'),         'Strength');
  assert.strictEqual(birthCard('Virgo'),       'The Hermit');
  assert.strictEqual(birthCard('Libra'),       'Justice');
  assert.strictEqual(birthCard('Scorpio'),     'Death');
  assert.strictEqual(birthCard('Sagittarius'), 'Temperance');
  assert.strictEqual(birthCard('Capricorn'),   'The Devil');
  assert.strictEqual(birthCard('Aquarius'),    'The Star');
  assert.strictEqual(birthCard('Pisces'),      'The Moon');
});

test('birthCard: unknown sign returns empty string', () => {
  assert.strictEqual(birthCard('Nope'), '');
  assert.strictEqual(birthCard(''),    '');
});

test('MAJOR_BY_SIGN covers exactly 12 signs', () => {
  assert.strictEqual(Object.keys(MAJOR_BY_SIGN).length, 12);
});

/* ---- decanCard: Fire triplicity (Wands) -------------------------------- */

test('decanCard: Aries d0 = 2 of Wands (cardinal, first decan)', () => {
  assert.strictEqual(decanCard('Aries', 0), '2 of Wands');
});

test('decanCard: Aries d1 = 3 of Wands', () => {
  assert.strictEqual(decanCard('Aries', 1), '3 of Wands');
});

test('decanCard: Aries d2 = 4 of Wands', () => {
  assert.strictEqual(decanCard('Aries', 2), '4 of Wands');
});

test('decanCard: Leo d0 = 5 of Wands (fixed)', () => {
  assert.strictEqual(decanCard('Leo', 0), '5 of Wands');
});

test('decanCard: Leo d1 = 6 of Wands', () => {
  assert.strictEqual(decanCard('Leo', 1), '6 of Wands');
});

test('decanCard: Leo d2 = 7 of Wands', () => {
  assert.strictEqual(decanCard('Leo', 2), '7 of Wands');
});

test('decanCard: Sagittarius d0 = 8 of Wands (mutable)', () => {
  assert.strictEqual(decanCard('Sagittarius', 0), '8 of Wands');
});

test('decanCard: Sagittarius d2 = 10 of Wands', () => {
  assert.strictEqual(decanCard('Sagittarius', 2), '10 of Wands');
});

/* ---- decanCard: Water triplicity (Cups) -------------------------------- */

test('decanCard: Cancer d0 = 2 of Cups (cardinal)', () => {
  assert.strictEqual(decanCard('Cancer', 0), '2 of Cups');
});

test('decanCard: Scorpio d0 = 5 of Cups (fixed)', () => {
  assert.strictEqual(decanCard('Scorpio', 0), '5 of Cups');
});

test('decanCard: Scorpio d1 = 6 of Cups', () => {
  assert.strictEqual(decanCard('Scorpio', 1), '6 of Cups');
});

test('decanCard: Pisces d2 = 10 of Cups (mutable)', () => {
  assert.strictEqual(decanCard('Pisces', 2), '10 of Cups');
});

/* ---- decanCard: Earth triplicity (Pentacles) -------------------------- */

test('decanCard: Capricorn d0 = 2 of Pentacles (cardinal)', () => {
  assert.strictEqual(decanCard('Capricorn', 0), '2 of Pentacles');
});

test('decanCard: Taurus d0 = 5 of Pentacles (fixed)', () => {
  assert.strictEqual(decanCard('Taurus', 0), '5 of Pentacles');
});

test('decanCard: Taurus d2 = 7 of Pentacles', () => {
  assert.strictEqual(decanCard('Taurus', 2), '7 of Pentacles');
});

test('decanCard: Virgo d2 = 10 of Pentacles (mutable)', () => {
  assert.strictEqual(decanCard('Virgo', 2), '10 of Pentacles');
});

/* ---- decanCard: Air triplicity (Swords) -------------------------------- */

test('decanCard: Libra d0 = 2 of Swords (cardinal)', () => {
  assert.strictEqual(decanCard('Libra', 0), '2 of Swords');
});

test('decanCard: Aquarius d0 = 5 of Swords (fixed)', () => {
  assert.strictEqual(decanCard('Aquarius', 0), '5 of Swords');
});

test('decanCard: Aquarius d1 = 6 of Swords', () => {
  assert.strictEqual(decanCard('Aquarius', 1), '6 of Swords');
});

test('decanCard: Gemini d2 = 10 of Swords (mutable)', () => {
  assert.strictEqual(decanCard('Gemini', 2), '10 of Swords');
});

/* ---- decanCard: bad input ---------------------------------------------- */

test('decanCard: unknown sign returns empty string', () => {
  assert.strictEqual(decanCard('Nope', 0), '');
});

test('decanCard: null decanIndex returns empty string', () => {
  assert.strictEqual(decanCard('Aries', null), '');
});

test('decanCard: undefined decanIndex returns empty string', () => {
  assert.strictEqual(decanCard('Aries', undefined), '');
});

/* ---- tarotFor ---------------------------------------------------------- */

test('tarotFor: Scorpio decan 1 → Death / 6 of Cups', () => {
  const result = tarotFor({ sun: { sign: 'Scorpio', decan: 1 } });
  assert.deepStrictEqual(result, { birthCard: 'Death', decanCard: '6 of Cups' });
});

test('tarotFor: Aries decan 0 → The Emperor / 2 of Wands', () => {
  const result = tarotFor({ sun: { sign: 'Aries', decan: 0 } });
  assert.deepStrictEqual(result, { birthCard: 'The Emperor', decanCard: '2 of Wands' });
});

test('tarotFor: Capricorn decan 0 → The Devil / 2 of Pentacles', () => {
  const result = tarotFor({ sun: { sign: 'Capricorn', decan: 0 } });
  assert.deepStrictEqual(result, { birthCard: 'The Devil', decanCard: '2 of Pentacles' });
});

test('tarotFor: Libra decan 0 → Justice / 2 of Swords', () => {
  const result = tarotFor({ sun: { sign: 'Libra', decan: 0 } });
  assert.deepStrictEqual(result, { birthCard: 'Justice', decanCard: '2 of Swords' });
});

test('tarotFor returns object with birthCard and decanCard keys', () => {
  const result = tarotFor({ sun: { sign: 'Leo', decan: 2 } });
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'birthCard'));
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'decanCard'));
  assert.strictEqual(result.birthCard, 'Strength');
  assert.strictEqual(result.decanCard, '7 of Wands');
});

/* ---- cardSlug ---------------------------------------------------------- */

test('cardSlug: The Emperor → major-emperor', () => {
  assert.strictEqual(cardSlug('The Emperor'), 'major-emperor');
});

test('cardSlug: Strength (no "The") → major-strength', () => {
  assert.strictEqual(cardSlug('Strength'), 'major-strength');
});

test('cardSlug: 2 of Wands → wands-02', () => {
  assert.strictEqual(cardSlug('2 of Wands'), 'wands-02');
});

test('cardSlug: 10 of Pentacles → pentacles-10', () => {
  assert.strictEqual(cardSlug('10 of Pentacles'), 'pentacles-10');
});

test('cardSlug: empty string → empty string', () => {
  assert.strictEqual(cardSlug(''), '');
});
