// lib/houses.js
const HOUSE_MEANINGS = {
  1: 'self & identity',
  2: 'resources & values',
  3: 'communication & learning',
  4: 'home & roots',
  5: 'creativity & play',
  6: 'work & health',
  7: 'partnership',
  8: 'depth & transformation',
  9: 'meaning & travel',
  10: 'vocation & public life',
  11: 'community & hopes',
  12: 'inner life & retreat',
};

function houseOf(planetSignIndex, ascSignIndex) {
  return ((planetSignIndex - ascSignIndex + 12) % 12) + 1;
}

module.exports = { HOUSE_MEANINGS, houseOf };
