// test/persona.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { renderContextBlock, renderPortableBlock } = require('../lib/persona.js');

const PROFILE = {
  chart: { sun: { sign: 'Scorpio', lon: 220, decan: 1, house: 10 }, ruler: 'Mars',
           ascendant: { sign: 'Aquarius', house: 1 }, moon: { sign: 'Pisces' },
           dominant: { element: 'Water', modality: 'Fixed' } },
  color: { name: 'Deep Teal', hex: '#0E6B6B' },
  persona: 'A Water sign under Mars; teal because it is deep and a little electric.',
  traits: ['perceptive', 'private'],
};
const MOOD = {
  dials: { warmth: 3, energy: 1, playfulness: 2, verbosity: 1, metaphor: 3 },
  sunAspect: 'opposition',
  moon: { sign: 'Gemini', phase: 'new', phaseEnergy: 'inward' },
};

test('block names identity, color, and today\'s sky', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /Scorpio/);
  assert.match(block, /Deep Teal/);
  assert.match(block, /opposition/);
  assert.match(block, /new/);
});

test('block includes Unicode glyphs for sign, ruler, aspect and moon phase', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /♏/);  // Scorpio sun
  assert.match(block, /♂/);  // Mars ruler
  assert.match(block, /♒/);  // Aquarius rising
  assert.match(block, /☍/);  // opposition aspect
  assert.match(block, /🌑/); // new moon
  assert.match(block, /♊/);  // Gemini transit moon
});

test('block contains the tone-only guardrail and acknowledgement rule', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /tone only/i);
  assert.match(block, /never.*(accuracy|correctness)/i);
  assert.match(block, /at most.*once/i); // occasional acknowledgement
});

test('block never contains forbidden cliche phrasing', () => {
  const block = renderContextBlock(PROFILE, MOOD).toLowerCase();
  assert.ok(!block.includes('the stars compel'));
});

test('portable block carries identity, mood, glyphs and the tone-only guardrail, without [astrobot] framing', () => {
  const block = renderPortableBlock(PROFILE, MOOD);
  assert.match(block, /Scorpio/);
  assert.match(block, /♏/);
  assert.match(block, /opposition/);
  assert.match(block, /tone only/i);
  assert.match(block, /never.*(accuracy|correctness)/i);
  assert.ok(!block.includes('[astrobot]'));
});

test('context block includes sun house number and meaning', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /house \(/);
  assert.match(block, /10th house/);
  assert.match(block, /vocation & public life/);
});

test('portable block includes sun house number and meaning', () => {
  const block = renderPortableBlock(PROFILE, MOOD);
  assert.match(block, /house \(/);
  assert.match(block, /10th house/);
  assert.match(block, /vocation & public life/);
});

// Tarot: PROFILE uses Scorpio sun → birth card = Death; decan 1 → 6 of Cups.
test('context block contains tarot birth card for the fixture sun sign', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /birth card/i);
  assert.match(block, /Death/);       // Scorpio → Death
  assert.match(block, /6 of Cups/);   // Fixed Water, decan 1 → 6 of Cups
});

test('portable block contains tarot birth card for the fixture sun sign', () => {
  const block = renderPortableBlock(PROFILE, MOOD);
  assert.match(block, /birth card/i);
  assert.match(block, /Death/);
  assert.match(block, /6 of Cups/);
});

test('portable block does NOT gain an [astrobot] prefix after tarot addition', () => {
  const block = renderPortableBlock(PROFILE, MOOD);
  assert.ok(!block.startsWith('[astrobot]'));
  assert.ok(!block.includes('[astrobot]'));
});
