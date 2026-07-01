const { eclipticLongitudeOf, moonPhaseAngle } = require('./ephemeris.js');
const { signFromLongitude } = require('./zodiac.js');
const { aspectBetweenSigns } = require('./aspects.js');
const { colorTone } = require('./colortone.js');

const PHASES = [
  'new', 'waxing crescent', 'first quarter', 'waxing gibbous',
  'full', 'waning gibbous', 'last quarter', 'waning crescent',
];

function phaseName(angle) {
  const a = ((angle % 360) + 360) % 360;
  // Center each named phase on its canonical angle (0,45,90,...315), width 45.
  const idx = Math.floor((a + 22.5) / 45) % 8;
  return PHASES[idx];
}

function phaseEnergy(name) {
  if (name === 'new') return 'inward';
  if (name === 'full') return 'expressive';
  if (name.startsWith('waxing') || name === 'first quarter') return 'building';
  return 'winding down';
}

// Each element trades up one dial and down another (roughly zero-sum across the
// four), so identity nudges the resting voice without piling everyone upward.
const ELEMENT_DELTA = {
  Fire:  { energy: +1, playfulness: +1 },
  Air:   { verbosity: +1, warmth: -1 },
  Earth: { energy: -1, metaphor: -1 },
  Water: { warmth: +1, metaphor: +1 },
};
const RULER_DELTA = {
  Mars:    { energy: +1, verbosity: -1 },
  Jupiter: { warmth: +1, verbosity: +1 },
  Saturn:  { warmth: -1, playfulness: -1 },
  Venus:   { warmth: +1, playfulness: +1 },
  Mercury: { playfulness: +1, verbosity: +1 },
  Sun:     { energy: +1, warmth: +1 },
  Moon:    { metaphor: +1, playfulness: -1 },
};
const SUN_ASPECT_DELTA = {
  conjunction: { energy: +1, warmth: +1 },
  semisextile: {},
  sextile:     { playfulness: +1 },
  square:      { energy: +1, playfulness: -1, verbosity: -1 },
  trine:       { warmth: +1, metaphor: +1 },
  quincunx:    { playfulness: -1 },
  opposition:  { warmth: -1, energy: -1, verbosity: -1 },
};
// The Moon's phase rides mainly the energy axis (a natural lunar cycle), with a
// single extra nudge at the peak/quiet — not three dials at once.
const PHASE_ENERGY_DELTA = {
  inward:        { energy: -1 },
  building:      { energy: +1 },
  expressive:    { playfulness: +1 },
  'winding down':{ energy: -1, playfulness: -1 },
};

// Prose "reading" fragments — a horoscope sentence built from the day's transits.
const ASPECT_READING = {
  conjunction: 'the Sun is home in your own sign — your season',
  semisextile: 'the Sun sits just past your own — a quiet, transitional day',
  sextile:     'the Sun is sextile your natal Sun — an easy, sociable day',
  square:      'the Sun squares your natal Sun — a sharper, more driven day',
  trine:       'the Sun trines your natal Sun — a warm, flowing day',
  quincunx:    'the Sun is quincunx your natal Sun — a slightly off-kilter, adjusting day',
  opposition:  'the Sun opposes your natal Sun — a reflective, contrast-aware day',
};
const PHASE_READING = {
  'new': 'a quiet new moon', 'waxing crescent': 'a waxing crescent moon',
  'first quarter': 'a first-quarter moon', 'waxing gibbous': 'a waxing gibbous moon',
  'full': 'a bright full moon', 'waning gibbous': 'a waning gibbous moon',
  'last quarter': 'a last-quarter moon', 'waning crescent': 'a waning crescent moon',
};

// Build a one-line daily reading from a computed mood.
function dailyReading(mood) {
  if (mood.solarReturn) {
    return 'It is your solar return — happy birthday. Every dial is turned up; be a little celebratory.';
  }
  const a = ASPECT_READING[mood.sunAspect] || 'the Sun moves overhead';
  const m = PHASE_READING[mood.moon.phase] || (mood.moon.phase + ' moon');
  const top = Object.keys(mood.dials).sort((x, y) => mood.dials[y] - mood.dials[x]).slice(0, 2);
  return `Today ${a}, with ${m} in ${mood.moon.sign}. Lean ${top[0]} and ${top[1]}.`;
}

function applyDelta(dials, delta) {
  for (const [k, v] of Object.entries(delta)) dials[k] += v;
}

function composeMood(chart, date, colorHex) {
  const dials = { warmth: 2, energy: 2, playfulness: 2, verbosity: 2, metaphor: 2 };

  applyDelta(dials, ELEMENT_DELTA[chart.dominant.element] || {});
  applyDelta(dials, RULER_DELTA[chart.ruler] || {});

  const natalSunIndex = signFromLongitude(chart.sun.lon).index;
  const transitSunLon = eclipticLongitudeOf('Sun', date);
  const transitSun = signFromLongitude(transitSunLon);
  const { aspect: sunAspect } = aspectBetweenSigns(natalSunIndex, transitSun.index);
  applyDelta(dials, SUN_ASPECT_DELTA[sunAspect] || {});

  const transitMoon = signFromLongitude(eclipticLongitudeOf('Moon', date));
  const moonPhase = phaseName(moonPhaseAngle(date));
  const energy = phaseEnergy(moonPhase);
  applyDelta(dials, PHASE_ENERGY_DELTA[energy] || {});

  // Color temperament (warm/cool + vivid/muted + planetary nudge) — optional; no-op if omitted.
  if (colorHex) applyDelta(dials, colorTone(colorHex));

  // Solar return (birthday): the transiting Sun back at the natal Sun's degree,
  // ~once a year (Sun moves ~1°/day). A celebratory boost to every dial.
  const sunGap = Math.abs(((transitSunLon - chart.sun.lon + 540) % 360) - 180);
  const isSolarReturn = sunGap < 0.75;
  if (isSolarReturn) for (const k of Object.keys(dials)) dials[k] += 2;

  for (const k of Object.keys(dials)) dials[k] = Math.max(0, Math.min(4, dials[k]));

  const result = {
    dials,
    sunAspect,
    solarReturn: isSolarReturn,
    moon: { sign: transitMoon.name, phase: moonPhase, phaseEnergy: energy },
  };
  result.reading = dailyReading(result);
  return result;
}

module.exports = { composeMood, phaseName, phaseEnergy, dailyReading };
