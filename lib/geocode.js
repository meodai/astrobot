// lib/geocode.js — Node-only; do NOT import from engine.js (keeps 408KB dataset out of bundle)
'use strict';
const CITIES = require('../vendor/cities-geo.json');

/**
 * geocode(query) → { name, cc, lat, lon } | null
 *
 * Normalize query (trim, lowercase). Comma format "City, CC" matches name before comma
 * and optionally country-code after. Match priority (array is population-sorted, first
 * match in each pass wins the most-populous city):
 *   1. exact name (case-insensitive)
 *   2. name startsWith
 *   3. name includes
 */
function geocode(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim();
  if (!q) return null;

  let nameQuery, ccQuery;
  if (q.includes(',')) {
    const parts = q.split(',');
    nameQuery = parts[0].trim().toLowerCase();
    ccQuery = parts[1].trim().toLowerCase();
  } else {
    nameQuery = q.toLowerCase();
    ccQuery = null;
  }

  // Three-pass: exact → startsWith → includes
  const passes = [
    (name) => name.toLowerCase() === nameQuery,
    (name) => name.toLowerCase().startsWith(nameQuery),
    (name) => name.toLowerCase().includes(nameQuery),
  ];

  for (const pass of passes) {
    for (const entry of CITIES) {
      const [name, cc, lat, lon] = entry;
      if (!pass(name)) continue;
      if (ccQuery && cc.toLowerCase() !== ccQuery) continue;
      return { name, cc, lat, lon };
    }
  }

  return null;
}

module.exports = { geocode };
