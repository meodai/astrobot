// lib/colorname.js
// Nearest-neighbor color name lookup using the vendored color-names bestof dataset.
// Pure CJS, browser-bundleable (esbuild inlines the JSON — no fs, no network).

const _data = require('../vendor/colornames.bestof.json');

// Precompute an array of { name, r, g, b } at module load time.
const _entries = _data.map(function (entry) {
  var h = entry.hex.replace('#', '');
  return {
    name: entry.name,
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
});

var _HEX_RE = /^#?[0-9a-f]{6}$/i;

/**
 * colorName(hex) → nearest color name by RGB euclidean distance.
 * Returns '' for bad/empty input.
 */
function colorName(hex) {
  if (typeof hex !== 'string' || !_HEX_RE.test(hex)) return '';
  var h = hex.replace('#', '');
  var r1 = parseInt(h.slice(0, 2), 16);
  var g1 = parseInt(h.slice(2, 4), 16);
  var b1 = parseInt(h.slice(4, 6), 16);

  var best = '';
  var bestDist = Infinity;
  for (var i = 0; i < _entries.length; i++) {
    var e = _entries[i];
    var dr = r1 - e.r;
    var dg = g1 - e.g;
    var db = b1 - e.b;
    var d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = e.name;
      if (d === 0) break; // exact match
    }
  }
  return best;
}

module.exports = { colorName };
