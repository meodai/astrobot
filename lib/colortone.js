// lib/colortone.js
// Color-to-temperament mapping: warm/cool axis, vivid/muted axis, planetary nudge.
// Also: chakra and theosophy lore for surfacing in persona and site.

function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

// Boll-Bezold/classical planetary color anchors; nearest by RGB distance.
const PLANET_ANCHORS = { Mars: '#E6C200', Mercury: '#C0392B', Jupiter: '#FFFFFF', Saturn: '#111111', Sun: '#D4AF37', Venus: '#2E8B57', Moon: '#C9CCD1' };
const PLANET_NUDGE   = { Mars: { energy: 1 }, Mercury: { playfulness: 1 }, Jupiter: { verbosity: 1 }, Saturn: { playfulness: -1 }, Sun: { warmth: 1 }, Venus: { warmth: 1 }, Moon: { metaphor: 1 } };

function rgb(hex) { const n = parseInt(/^#?([0-9a-f]{6})$/i.exec(hex)[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function nearestPlanet(hex) { const c = rgb(hex); let best = null, bd = 1e9; for (const p in PLANET_ANCHORS) { const a = rgb(PLANET_ANCHORS[p]); const dd = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 + (c[2] - a[2]) ** 2; if (dd < bd) { bd = dd; best = p; } } return best; }

const CHAKRAS = [ // {max hue exclusive, name, theme}; root wraps 345..360 and 0..15
  { max: 15, name: 'root', theme: 'grounding & survival' }, { max: 45, name: 'sacral', theme: 'creativity & pleasure' },
  { max: 70, name: 'solar plexus', theme: 'will & confidence' }, { max: 165, name: 'heart', theme: 'love & balance' },
  { max: 255, name: 'throat', theme: 'communication & truth' }, { max: 285, name: 'third eye', theme: 'intuition & insight' },
  { max: 345, name: 'crown', theme: 'spirit & meaning' } ];
function chakraOf(h) { const x = ((h % 360) + 360) % 360; if (x >= 345) return { name: 'root', theme: 'grounding & survival' }; for (const c of CHAKRAS) if (x < c.max) return { name: c.name, theme: c.theme }; return { name: 'crown', theme: 'spirit & meaning' }; }

function theosophyOf(hsl) { if (hsl.l < 25) return 'depth & gravity'; const x = ((hsl.h % 360) + 360) % 360;
  if (x >= 345 || x < 15) return 'courage'; if (x < 45) return 'ambition'; if (x < 70) return 'intellect';
  if (x < 165) return 'sympathy'; if (x < 255) return 'devotion'; if (x < 310) return 'spiritual aspiration'; return 'love'; }

function warmthCos(h) { return Math.cos(((h - 35) * Math.PI) / 180); }

function colorTone(hex) { const hsl = hexToHsl(hex); if (!hsl) return {}; const d = {}; const add = (k, v) => d[k] = (d[k] || 0) + v;
  const w = warmthCos(hsl.h); if (w > 0.4) add('warmth', 1); else if (w < -0.4) add('warmth', -1);
  if (hsl.s >= 60) { add('playfulness', 1); add('metaphor', 1); add('energy', 1); } else if (hsl.s <= 25) { add('playfulness', -1); add('verbosity', -1); }
  const nudge = PLANET_NUDGE[nearestPlanet(hex)] || {}; for (const k in nudge) add(k, nudge[k]); return d; }

function colorLore(hex) { const hsl = hexToHsl(hex); if (!hsl) return null; const w = warmthCos(hsl.h);
  return { warmCool: w > 0.4 ? 'warm' : w < -0.4 ? 'cool' : 'balanced', vividMuted: hsl.s >= 60 ? 'vivid' : hsl.s <= 25 ? 'muted' : 'soft',
    planet: nearestPlanet(hex), chakra: chakraOf(hsl.h), theosophy: theosophyOf(hsl) }; }

module.exports = { hexToHsl, colorTone, colorLore, nearestPlanet };
