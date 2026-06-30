const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

test('built site bundle exposes the engine and computes a chart', () => {
  const code = fs.readFileSync(require('path').join(__dirname, '..', 'site', 'astrobot.bundle.js'), 'utf8');
  const ctx = { globalThis: {}, module: {}, exports: {} };
  ctx.global = ctx; // some bundles reference global
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.__A = (typeof Astrobot!=="undefined")?Astrobot:globalThis.Astrobot;', ctx);
  const A = ctx.__A || ctx.Astrobot || ctx.globalThis.Astrobot;
  assert.ok(A && typeof A.computeChart === 'function', 'computeChart present');
  const chart = A.computeChart({ datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 });
  assert.strictEqual(chart.sun.sign, 'Capricorn');
  assert.strictEqual(chart.ascendant.sign, 'Aries');
  assert.ok(A.CITIES && A.CITIES['London'], 'cities bundled');
});
