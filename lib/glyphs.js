// lib/glyphs.js
// Unicode astrological symbols — https://en.wikipedia.org/wiki/Astrological_symbols
const SIGN_GLYPHS = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};
const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀',
  Mars: '♂', Jupiter: '♃', Saturn: '♄',
};
const ASPECT_GLYPHS = {
  conjunction: '☌', semisextile: '⚺', sextile: '⚹', square: '□',
  trine: '△', quincunx: '⚻', opposition: '☍',
};
const MOON_PHASE_GLYPHS = {
  'new': '🌑', 'waxing crescent': '🌒', 'first quarter': '🌓',
  'waxing gibbous': '🌔', 'full': '🌕', 'waning gibbous': '🌖',
  'last quarter': '🌗', 'waning crescent': '🌘',
};

Object.freeze(SIGN_GLYPHS);
Object.freeze(PLANET_GLYPHS);
Object.freeze(ASPECT_GLYPHS);
Object.freeze(MOON_PHASE_GLYPHS);

const lookup = (map) => (name) => map[name] || '';

module.exports = {
  SIGN_GLYPHS, PLANET_GLYPHS, ASPECT_GLYPHS, MOON_PHASE_GLYPHS,
  signGlyph: lookup(SIGN_GLYPHS),
  planetGlyph: lookup(PLANET_GLYPHS),
  aspectGlyph: lookup(ASPECT_GLYPHS),
  moonPhaseGlyph: lookup(MOON_PHASE_GLYPHS),
};
