// lib/roll.js
const fs = require('node:fs');
const path = require('node:path');

let GEO = [];
try {
  GEO = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vendor', 'cities-geo.json'), 'utf8'));
} catch {
  GEO = [];
}

function rng(seed) {
  if (seed == null) return Math.random;
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function rollColor(rand) {
  return hslToHex(
    Math.floor(rand() * 360),
    45 + Math.floor(rand() * 30),
    38 + Math.floor(rand() * 22)
  );
}

function rollBirth(rand) {
  const doy = Math.floor(rand() * 365);
  const d = new Date(Date.UTC(2001, 0, 1) + doy * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(Math.floor(rand() * 24)).padStart(2, '0');
  const mi = String(Math.floor(rand() * 60)).padStart(2, '0');
  const entry = GEO[Math.floor(rand() * GEO.length)] || ['Greenwich', 'GB', 51.48, 0];
  const place = entry[0] + ', ' + entry[1];
  return {
    datetime: `2001-${mm}-${dd}T${hh}:${mi}:00`,
    tzOffsetMinutes: 0,
    place,
    lat: entry[2],
    lon: entry[3],
  };
}

function roll(seed, now) {
  const r = rng(seed);
  const birth = rollBirth(r);
  const colorHex = rollColor(r);
  if (now) {
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    birth.datetime = birth.datetime.slice(0, 11) + `${hh}:${mi}:00`; // keep rolled date, real time
  }
  return { birth, colorHex };
}

module.exports = { roll, rng, hslToHex, rollColor, rollBirth };
