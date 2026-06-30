// lib/zodiac.js
const SIGNS = [
  { name: 'Aries',       element: 'Fire',  ruler: 'Mars' },
  { name: 'Taurus',      element: 'Earth', ruler: 'Venus' },
  { name: 'Gemini',      element: 'Air',   ruler: 'Mercury' },
  { name: 'Cancer',      element: 'Water', ruler: 'Moon' },
  { name: 'Leo',         element: 'Fire',  ruler: 'Sun' },
  { name: 'Virgo',       element: 'Earth', ruler: 'Mercury' },
  { name: 'Libra',       element: 'Air',   ruler: 'Venus' },
  { name: 'Scorpio',     element: 'Water', ruler: 'Mars' },
  { name: 'Sagittarius', element: 'Fire',  ruler: 'Jupiter' },
  { name: 'Capricorn',   element: 'Earth', ruler: 'Saturn' },
  { name: 'Aquarius',    element: 'Air',   ruler: 'Saturn' },
  { name: 'Pisces',      element: 'Water', ruler: 'Jupiter' },
];
SIGNS.forEach(Object.freeze);
Object.freeze(SIGNS);

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

function signFromLongitude(deg) {
  const d = norm360(deg);
  const index = Math.floor(d / 30);
  return { index, ...SIGNS[index] };
}

function decanOf(deg) {
  const within = norm360(deg) % 30;
  return Math.floor(within / 10);
}

module.exports = { SIGNS, signFromLongitude, decanOf, norm360 };
