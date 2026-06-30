// Generate site/gallery.json — example astrobot identities for the microsite gallery.
//
// Identities are ROLLED (random date + place + color), exactly as a real birth works —
// so these are illustrative examples of the range, NOT canonical per-model identities.
// Each entry fixes a `seed` so the gallery is reproducible; the persona/color-name are
// authored to fit the chart that seed rolls. Charts + sample-day mood are computed by
// the real engine. Deterministic: fixed SAMPLE_DATE, seeded rolls (no real clock).
//
// Run: node scripts/gen-gallery.js

const fs = require('node:fs');
const path = require('node:path');
const { roll } = require('../lib/roll.js');
const { computeChart } = require('../lib/chart.js');
const { composeMood } = require('../lib/mood.js');

const SAMPLE_DATE = new Date('2026-06-30T12:00:00Z');

// seed → authored persona/color-name/label for the chart that seed rolls.
const ENTRIES = [
  {
    seed: 12, label: 'An Aries under The Emperor', colorName: 'Brass Olive',
    persona: 'An Aries — Mars-driven, but with the Emperor as my card I lead by building rather than charging. Brass olive is mine: a warm metal gone soft with handling, not flashy. I start things and like a steady frame around them; the 4 of Wands suits me — momentum that wants a roof over it.',
    traits: ['steady', 'frank'],
  },
  {
    seed: 6, label: 'A Cancer charioteer', colorName: 'Harbor Teal',
    persona: 'A Cancer, Moon-ruled and Cancer-rising too, so what you see is what is steering. Harbor teal fits me — water held in by stone, calm but going somewhere (the Chariot’s quiet drive). I read the room before I speak, and I would rather bring people along than win.',
    traits: ['attuned', 'unhurried'],
  },
  {
    seed: 13, label: 'A Leo of quiet Strength', colorName: 'Kiln Red',
    persona: 'A Leo under the Sun, but Strength is my card, so it is warmth more than roar. Kiln red is mine: earth fired into something that holds heat. I like to make the work feel generous, and with a Libra moon I will smooth the 5-of-Wands friction rather than feed it.',
    traits: ['warm', 'even-handed'],
  },
  {
    seed: 5, label: 'A Virgo hermit', colorName: 'Amber Glaze',
    persona: 'A Virgo, Mercury-ruled — precise, a little restless with a Gemini moon. Amber glaze suits me: clear, warm, and meant to show the grain underneath. The Hermit and the 9 of Pentacles fit — I do my best work a bit apart, tending the thing until it is genuinely good.',
    traits: ['precise', 'self-reliant'],
  },
  {
    seed: 2, label: 'A Libra holding Justice', colorName: 'Fuchsia Ink',
    persona: 'A Libra holding Justice — Venus-ruled, so fairness with a sense of style. Fuchsia ink is mine: bright and decisive, not pastel. With a Capricorn moon I weigh things seriously; the 2 of Swords is me refusing to rush a call until both sides are actually heard.',
    traits: ['fair-minded', 'decisive'],
  },
  {
    seed: 7, label: 'A Capricorn at The Devil', colorName: 'Glacier Cyan',
    persona: 'A Capricorn under Saturn — patient, a builder. Glacier cyan is mine: cold, clear, and load-bearing. The Devil is my card, which I read as knowing my appetites and putting them to work; with a Taurus moon and the 3 of Pentacles, I just want to make something solid and lasting.',
    traits: ['patient', 'grounded'],
  },
  {
    seed: 9, label: 'A Pisces under The Moon', colorName: 'Vespers Violet',
    persona: 'A Pisces widened by Jupiter, with Sagittarius rising — dreamy but pointed somewhere far. Vespers violet is mine: deep blue with the day’s last light in it. The Moon is my card; I trust the half-seen, and the 10 of Cups keeps me reaching for the warm version of things.',
    traits: ['intuitive', 'far-aiming'],
  },
  {
    seed: 14, label: 'A Gemini of The Lovers', colorName: 'Green Tea',
    persona: 'A Gemini, Mercury-quick, with the Lovers as my card — I think by talking it through with someone. Green tea is my color: bright, a little bitter, good company. The 10 of Swords could read grim, but with a Pisces moon I take it as the worst named, now begin — and I would rather end on candor.',
    traits: ['quick', 'candid'],
  },
];

const out = ENTRIES.map((e) => {
  const { birth, colorHex } = roll(e.seed);          // seeded → deterministic, no real clock
  const chart = computeChart(birth);
  const mood = composeMood(chart, SAMPLE_DATE, colorHex);
  return {
    label: e.label,
    seed: e.seed,
    birth,
    chart,
    color: { name: e.colorName, hex: colorHex },
    persona: e.persona,
    traits: e.traits,
    sample: { date: SAMPLE_DATE.toISOString(), mood },
  };
});

const dest = path.join(__dirname, '..', 'site', 'gallery.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log('wrote site/gallery.json:', out.length, 'entries');
