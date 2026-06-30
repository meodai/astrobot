// lib/places.js — resolve birth coordinates with a bundled fallback table.
const fs = require('node:fs');
const path = require('node:path');

let CITIES = {};
try {
  CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vendor', 'cities.json'), 'utf8'));
} catch {
  CITIES = {};
}

// Royal Observatory, Greenwich — the canonical default when nothing else resolves.
const DEFAULT_COORDS = { lat: 51.48, lon: 0.0 };

function resolveCoords(birth) {
  const b = birth || {};
  if (Number.isFinite(b.lat) && Number.isFinite(b.lon)) return { lat: b.lat, lon: b.lon };
  if (b.place) {
    const want = String(b.place).trim().toLowerCase();
    let key = Object.keys(CITIES).find((c) => c.toLowerCase() === want);
    if (!key) {
      const cityOnly = String(b.place).split(',')[0].trim().toLowerCase();
      key = Object.keys(CITIES).find((c) => c.toLowerCase() === cityOnly);
    }
    if (key) return { lat: CITIES[key].lat, lon: CITIES[key].lon };
  }
  return { ...DEFAULT_COORDS };
}

module.exports = { resolveCoords, DEFAULT_COORDS };
