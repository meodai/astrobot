// lib/aspects.js
const ASPECT_BY_DISTANCE = [
  'conjunction', // 0
  'semisextile', // 1
  'sextile',     // 2
  'square',      // 3
  'trine',       // 4
  'quincunx',    // 5
  'opposition',  // 6
];

function aspectBetweenSigns(indexA, indexB) {
  const raw = Math.abs(indexA - indexB);
  const distance = Math.min(raw, 12 - raw);
  return { distance, aspect: ASPECT_BY_DISTANCE[distance] };
}

module.exports = { aspectBetweenSigns, ASPECT_BY_DISTANCE };
