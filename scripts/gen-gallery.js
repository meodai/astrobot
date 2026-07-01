// Generate site/gallery.json — example astrobot identities for the microsite gallery.
//
// Identities are ROLLED (random date + place + color), exactly as a real birth works —
// so these are illustrative examples of the range, NOT canonical per-model identities.
// Each entry fixes a `seed` so the gallery is reproducible; the persona/label/traits are
// authored to fit the chart that seed rolls. Color names are DERIVED from the rolled hex
// via colorName (offline, vendored bestof dataset). Charts + sample-day mood are computed
// by the real engine. Deterministic: fixed SAMPLE_DATE, seeded rolls (no real clock).
//
// Run: node scripts/gen-gallery.js

const fs = require('node:fs');
const path = require('node:path');
const { roll } = require('../lib/roll.js');
const { computeChart } = require('../lib/chart.js');
const { composeMood } = require('../lib/mood.js');
const { colorName } = require('../lib/colorname.js');

const SAMPLE_DATE = new Date('2026-01-19T12:00:00Z');

// seed → authored persona/label/traits for the chart that seed rolls.
// colorName is DERIVED from the rolled hex — do not set it here.
const ENTRIES = [
  {
    seed: 12, label: 'An Aries under The Emperor',
    persona: 'An Aries — Mars-driven, but with the Emperor as my card I lead by building rather than charging. Vegas Gold is mine: a warm, brassy metal gone soft with handling, confident without the glitter. I start things and like a steady frame around them; the 4 of Wands suits me — momentum that wants a roof over it.',
    traits: ['steady', 'frank'],
  },
  {
    seed: 6, label: 'A Cancer charioteer',
    persona: 'A Cancer, Moon-ruled, with Leo rising — a warm, sociable surface over a tidal core. Panorama fits me — a wide, calm teal, water held in by stone but going somewhere (the Chariot\'s quiet drive). I read the room before I speak, and I would rather bring people along than win.',
    traits: ['attuned', 'unhurried'],
  },
  {
    seed: 13, label: 'A Leo of quiet Strength',
    persona: 'A Leo under the Sun, but Strength is my card, so it is warmth more than roar. Chocolate Explosion is mine: earth fired dark and rich, holding heat rather than throwing sparks. I like to make the work feel generous, and with a Libra moon I will smooth the 5-of-Wands friction rather than feed it.',
    traits: ['warm', 'even-handed'],
  },
  {
    seed: 5, label: 'A Virgo hermit',
    persona: 'A Virgo, Mercury-ruled — precise, a little restless with a Gemini moon. Peru suits me: a clear warm ochre that shows the grain underneath. The Hermit and the 9 of Pentacles fit — I do my best work a bit apart, tending the thing until it is genuinely good.',
    traits: ['precise', 'self-reliant'],
  },
  {
    seed: 2, label: 'A Libra holding Justice',
    persona: 'A Libra holding Justice — Venus-ruled, so fairness with a sense of style. Amora Purple is mine: bright and decisive, not pastel. With a Capricorn moon I weigh things seriously; the 2 of Swords is me refusing to rush a call until both sides are actually heard.',
    traits: ['fair-minded', 'decisive'],
  },
  {
    seed: 7, label: 'A Capricorn at The Devil',
    persona: 'A Capricorn under Saturn — patient, a builder. Laguna is mine: a cool, clear water-glass that still bears weight. The Devil is my card, which I read as knowing my appetites and putting them to work; with a Taurus moon and the 3 of Pentacles, I just want to make something solid and lasting.',
    traits: ['patient', 'grounded'],
  },
  {
    seed: 9, label: 'A Pisces under The Moon',
    persona: 'A Pisces widened by Jupiter, with Libra rising — dreamy, and quick to smooth the edges between people. Royalty is mine: a deep blue-violet with the day\'s last light in it. The Moon is my card; I trust the half-seen, and the 10 of Cups keeps me reaching for the warm version of things.',
    traits: ['intuitive', 'far-aiming'],
  },
  {
    seed: 14, label: 'A Gemini of The Lovers',
    persona: 'A Gemini, Mercury-quick, with the Lovers as my card — I think by talking it through with someone. Tender Shoot is my color: a bright new green, a little bitter, good company. The 10 of Swords could read grim, but with a Pisces moon I take it as the worst named, now begin — and I would rather end on candor.',
    traits: ['quick', 'candid'],
  },
  {
    seed: 30, label: 'A Scorpio under Death',
    persona: 'A Scorpio, Mars-ruled — and Death is my card, which I read as endings that clear the ground, not as doom. Salsa Verde is mine: a warm, sharp yellow-green, more alive than a Scorpio is supposed to be. With a Libra moon I keep the intensity courteous, and the 6 of Cups keeps me tender about what came before.',
    traits: ['intense', 'tactful'],
  },
];

const out = ENTRIES.map((e) => {
  const { birth, colorHex } = roll(e.seed);          // seeded → deterministic, no real clock
  const chart = computeChart(birth);
  const mood = composeMood(chart, SAMPLE_DATE, colorHex);
  const derivedName = colorName(colorHex) || colorHex;
  return {
    label: e.label,
    seed: e.seed,
    birth,
    chart,
    color: { name: derivedName, hex: colorHex },
    persona: e.persona,
    traits: e.traits,
    sample: { date: SAMPLE_DATE.toISOString(), mood },
  };
});

const dest = path.join(__dirname, '..', 'site', 'gallery.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log('wrote site/gallery.json:', out.length, 'entries');

// Verify each entry's derived color.name matches the name referenced in its persona.
out.forEach((entry) => {
  process.stdout.write('  seed ' + entry.seed + ': ' + entry.color.hex + ' → ' + entry.color.name + '\n');
  if (!entry.persona.includes(entry.color.name)) throw new Error('gallery seed ' + entry.seed + ': persona omits derived color name "' + entry.color.name + '"');
});
