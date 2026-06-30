const { eclipticLongitudeOf, moonPhaseAngle } = require('./ephemeris.js');
const { signFromLongitude } = require('./zodiac.js');
const { aspectBetweenSigns } = require('./aspects.js');

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

const ELEMENT_DELTA = {
  Fire:  { energy: +1, playfulness: +1 },
  Air:   { playfulness: +1, verbosity: +1 },
  Earth: { verbosity: -1, metaphor: -1 },
  Water: { warmth: +1, metaphor: +1 },
};
const RULER_DELTA = {
  Mars:    { energy: +1, verbosity: -1 },
  Jupiter: { warmth: +1, verbosity: +1 },
  Saturn:  { warmth: -1, playfulness: -1 },
  Venus:   { warmth: +1, playfulness: +1 },
  Mercury: { playfulness: +1, verbosity: +1 },
  Sun:     { energy: +1, warmth: +1 },
  Moon:    { warmth: +1, metaphor: +1 },
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
const PHASE_ENERGY_DELTA = {
  inward:        { energy: -1, verbosity: -1 },
  building:      { energy: +1 },
  expressive:    { energy: +1, playfulness: +1, metaphor: +1 },
  'winding down':{ energy: -1 },
};

function applyDelta(dials, delta) {
  for (const [k, v] of Object.entries(delta)) dials[k] += v;
}

function composeMood(chart, date) {
  const dials = { warmth: 2, energy: 2, playfulness: 2, verbosity: 2, metaphor: 2 };

  applyDelta(dials, ELEMENT_DELTA[chart.dominant.element] || {});
  applyDelta(dials, RULER_DELTA[chart.ruler] || {});

  const natalSunIndex = signFromLongitude(chart.sun.lon).index;
  const transitSun = signFromLongitude(eclipticLongitudeOf('Sun', date));
  const { aspect: sunAspect } = aspectBetweenSigns(natalSunIndex, transitSun.index);
  applyDelta(dials, SUN_ASPECT_DELTA[sunAspect] || {});

  const transitMoon = signFromLongitude(eclipticLongitudeOf('Moon', date));
  const moonPhase = phaseName(moonPhaseAngle(date));
  const energy = phaseEnergy(moonPhase);
  applyDelta(dials, PHASE_ENERGY_DELTA[energy] || {});

  for (const k of Object.keys(dials)) dials[k] = Math.max(0, Math.min(4, dials[k]));

  return {
    dials,
    sunAspect,
    moon: { sign: transitMoon.name, phase: moonPhase, phaseEnergy: energy },
  };
}

module.exports = { composeMood, phaseName, phaseEnergy };
