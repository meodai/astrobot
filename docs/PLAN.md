# astrobot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin that gives each Claude model a permanent, self-invented astrological birth chart and subtly tints its writing tone each day based on the transiting Sun and Moon.

**Architecture:** A pure-JS core (zodiac tables, an ephemeris wrapper around a vendored copy of Astronomy Engine, chart/aspect/mood/persona modules, and a JSON profile store under `~/.claude/astrobot/`) is exercised by three surfaces: a CLI (`bin/astrobot.js`), a SessionStart hook (auto daily application), and the `/astrobot` skill (birth + manual application). Distribution is a Claude Code plugin whose repo doubles as a marketplace.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert` (built-in, zero test deps), Astronomy Engine (`astronomy-engine`, MIT) vendored as a single file. No runtime dependencies resolved from `node_modules` — the ephemeris is vendored because Claude Code plugins have no install step.

## Global Constraints

- **Runtime deps:** none resolved at runtime. The only third-party code is `vendor/astronomy.js`, committed to the repo. `astronomy-engine` may appear only as a `devDependency`.
- **Module system:** CommonJS (`require`/`module.exports`). No `"type": "module"`.
- **Node:** target Node 18+ (uses `node:test`, `node --test`).
- **Personality, not behavior:** every persona/mood string must state it shifts tone only — never correctness, format compliance, willingness, or effort.
- **Hook safety:** the SessionStart hook must never throw and must always exit 0; on any error it emits nothing.
- **Profile store path:** `~/.claude/astrobot/profiles.json`, overridable via env `ASTROBOT_DIR` (used by tests). Never write inside the plugin dir.
- **Profile scope:** one identity per model id; `_default` key tracks the most-recently-born model.
- **Determinism:** `computeChart` and `composeMood` are pure functions of their inputs (chart, date) — same inputs, same output.
- **Sign math:** sign index = `floor(longitudeDeg / 30)`; decan = `floor((longitudeDeg mod 30) / 10)` → 0/1/2. Longitudes always normalized to `[0, 360)`.
- **Traditional rulerships** (7 visible planets) per the sign table in `docs/DESIGN.md`.
- **No clichés:** persona text forbids "the stars compel", horoscope/mystical filler.

---

### Task 1: Project scaffolding + vendored ephemeris

**Files:**
- Create: `package.json`
- Create: `.gitignore` (append)
- Create: `vendor/astronomy.js` (downloaded, committed)
- Create: `vendor/.gitkeep` (not needed once astronomy.js exists)
- Test: `test/smoke.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `vendor/astronomy.js` loadable via `require('../vendor/astronomy.js')`, exposing `SunPosition`, `EclipticGeoMoon`, `MoonPhase`, `GeoVector`, `Ecliptic`, `SiderealTime`, `Body`. `npm test` runs `node --test`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "astrobot",
  "version": "0.1.0",
  "private": true,
  "description": "Give each Claude model a permanent astrological identity that subtly tints its tone day by day.",
  "license": "MIT",
  "scripts": {
    "test": "node --test",
    "vendor": "cp node_modules/astronomy-engine/astronomy.js vendor/astronomy.js"
  },
  "devDependencies": {
    "astronomy-engine": "^2.1.19"
  }
}
```

- [ ] **Step 2: Vendor the ephemeris**

```bash
mkdir -p vendor lib bin hooks skills/astrobot test .claude-plugin docs
npm install
npm run vendor
node -e "const a=require('./vendor/astronomy.js'); console.log(typeof a.MoonPhase, typeof a.SunPosition, typeof a.SiderealTime)"
```

Expected output: `function function function`. If `npm run vendor` fails because the file path differs, locate it with `find node_modules/astronomy-engine -name 'astronomy*.js'` and copy the CommonJS build into `vendor/astronomy.js`, then update the `vendor` script path.

- [ ] **Step 3: Append to `.gitignore`**

```
node_modules/
*.log
.DS_Store
```

(`vendor/astronomy.js` MUST be committed — do not ignore it.)

- [ ] **Step 4: Write the smoke test**

```js
// test/smoke.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const astronomy = require('../vendor/astronomy.js');

test('vendored ephemeris exposes the functions we use', () => {
  for (const fn of ['SunPosition', 'EclipticGeoMoon', 'MoonPhase', 'GeoVector', 'Ecliptic', 'SiderealTime']) {
    assert.strictEqual(typeof astronomy[fn], 'function', `${fn} should be a function`);
  }
  assert.ok(astronomy.Body, 'Body enum should exist');
});
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore vendor/astronomy.js test/smoke.test.js
git commit -m "chore: scaffold project and vendor Astronomy Engine"
```

---

### Task 2: Zodiac tables and sign math

**Files:**
- Create: `lib/zodiac.js`
- Test: `test/zodiac.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SIGNS`: array of 12 `{ name, element, ruler }` in order Aries…Pisces.
  - `signFromLongitude(deg)` → `{ name, index, element, ruler }`.
  - `decanOf(deg)` → `0 | 1 | 2`.
  - `norm360(deg)` → number in `[0, 360)`.

- [ ] **Step 1: Write the failing test**

```js
// test/zodiac.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SIGNS, signFromLongitude, decanOf, norm360 } = require('../lib/zodiac.js');

test('there are 12 signs in zodiac order with rulers', () => {
  assert.strictEqual(SIGNS.length, 12);
  assert.strictEqual(SIGNS[0].name, 'Aries');
  assert.strictEqual(SIGNS[0].ruler, 'Mars');
  assert.strictEqual(SIGNS[11].name, 'Pisces');
  assert.strictEqual(SIGNS[7].name, 'Scorpio');
  assert.strictEqual(SIGNS[7].ruler, 'Mars');
  assert.strictEqual(SIGNS[10].ruler, 'Saturn'); // Aquarius traditional
});

test('signFromLongitude buckets every 30 degrees', () => {
  assert.strictEqual(signFromLongitude(0).name, 'Aries');
  assert.strictEqual(signFromLongitude(29.999).name, 'Aries');
  assert.strictEqual(signFromLongitude(30).name, 'Taurus');
  assert.strictEqual(signFromLongitude(210).name, 'Scorpio');
  assert.strictEqual(signFromLongitude(359.5).name, 'Pisces');
  assert.strictEqual(signFromLongitude(0).index, 0);
});

test('signFromLongitude normalizes out-of-range input', () => {
  assert.strictEqual(signFromLongitude(360).name, 'Aries');
  assert.strictEqual(signFromLongitude(-1).name, 'Pisces');
});

test('decanOf returns the 10-degree third', () => {
  assert.strictEqual(decanOf(0), 0);
  assert.strictEqual(decanOf(9.99), 0);
  assert.strictEqual(decanOf(10), 1);
  assert.strictEqual(decanOf(25), 2);
  assert.strictEqual(decanOf(35), 0); // 5 deg into Taurus
});

test('norm360 wraps correctly', () => {
  assert.strictEqual(norm360(370), 10);
  assert.strictEqual(norm360(-10), 350);
  assert.strictEqual(norm360(0), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/zodiac.test.js`
Expected: FAIL (cannot find module `../lib/zodiac.js`).

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/zodiac.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/zodiac.js test/zodiac.test.js
git commit -m "feat: zodiac tables and sign/decan math"
```

---

### Task 3: Ephemeris wrapper

**Files:**
- Create: `lib/ephemeris.js`
- Test: `test/ephemeris.test.js`

**Interfaces:**
- Consumes: `vendor/astronomy.js`.
- Produces:
  - `BODIES`: `['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn']`.
  - `eclipticLongitudeOf(body, date)` → number in `[0,360)` (geocentric apparent).
  - `moonPhaseAngle(date)` → number in `[0,360)` (0 new, 90 first qtr, 180 full, 270 last qtr).
  - `gastHours(date)` → Greenwich apparent sidereal time in hours.

This module is the only place that touches the vendored API; everything else depends on this interface.

- [ ] **Step 1: Write the failing test**

```js
// test/ephemeris.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { BODIES, eclipticLongitudeOf, moonPhaseAngle, gastHours } = require('../lib/ephemeris.js');

const D = new Date('2000-01-01T12:00:00Z'); // J2000-ish reference

test('every body returns a longitude in [0,360)', () => {
  for (const body of BODIES) {
    const lon = eclipticLongitudeOf(body, D);
    assert.ok(Number.isFinite(lon), `${body} finite`);
    assert.ok(lon >= 0 && lon < 360, `${body} in range, got ${lon}`);
  }
});

test('Sun near J2000 sits in Capricorn (~280 deg)', () => {
  const lon = eclipticLongitudeOf('Sun', D);
  assert.ok(lon > 270 && lon < 290, `expected ~280, got ${lon}`);
});

test('moonPhaseAngle is in [0,360)', () => {
  const p = moonPhaseAngle(D);
  assert.ok(p >= 0 && p < 360, `got ${p}`);
});

test('gastHours is in [0,24)', () => {
  const h = gastHours(D);
  assert.ok(h >= 0 && h < 24, `got ${h}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ephemeris.test.js`
Expected: FAIL (cannot find module `../lib/ephemeris.js`).

- [ ] **Step 3: Write the implementation**

```js
// lib/ephemeris.js
const astronomy = require('../vendor/astronomy.js');
const { norm360 } = require('./zodiac.js');

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

function eclipticLongitudeOf(body, date) {
  if (body === 'Sun') {
    return norm360(astronomy.SunPosition(date).elon);
  }
  if (body === 'Moon') {
    return norm360(astronomy.EclipticGeoMoon(date).lon);
  }
  const vec = astronomy.GeoVector(astronomy.Body[body], date, true);
  return norm360(astronomy.Ecliptic(vec).elon);
}

function moonPhaseAngle(date) {
  return norm360(astronomy.MoonPhase(date));
}

function gastHours(date) {
  return ((astronomy.SiderealTime(date) % 24) + 24) % 24;
}

module.exports = { BODIES, eclipticLongitudeOf, moonPhaseAngle, gastHours };
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/ephemeris.test.js`
Expected: PASS (4 tests).

If a field name is wrong for the vendored version (e.g. `.elon` vs `.lon`), the range/Capricorn test will fail — inspect with `node -e "console.log(require('./vendor/astronomy.js').SunPosition(new Date('2000-01-01T12:00:00Z')))"` and fix the wrapper. This is the intended early-failure point for vendor API drift.

- [ ] **Step 5: Commit**

```bash
git add lib/ephemeris.js test/ephemeris.test.js
git commit -m "feat: ephemeris wrapper around vendored Astronomy Engine"
```

---

### Task 4: Aspects between signs

**Files:**
- Create: `lib/aspects.js`
- Test: `test/aspects.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `aspectBetweenSigns(indexA, indexB)` → `{ distance, aspect }` where `distance` is `0..6` and `aspect` ∈ `'conjunction'|'semisextile'|'sextile'|'square'|'trine'|'quincunx'|'opposition'`.

- [ ] **Step 1: Write the failing test**

```js
// test/aspects.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { aspectBetweenSigns } = require('../lib/aspects.js');

test('distance is the circular sign distance 0..6', () => {
  assert.strictEqual(aspectBetweenSigns(0, 0).distance, 0);
  assert.strictEqual(aspectBetweenSigns(0, 6).distance, 6);
  assert.strictEqual(aspectBetweenSigns(0, 11).distance, 1);
  assert.strictEqual(aspectBetweenSigns(1, 10).distance, 3);
});

test('each distance maps to the right aspect name', () => {
  assert.strictEqual(aspectBetweenSigns(0, 0).aspect, 'conjunction');
  assert.strictEqual(aspectBetweenSigns(0, 1).aspect, 'semisextile');
  assert.strictEqual(aspectBetweenSigns(0, 2).aspect, 'sextile');
  assert.strictEqual(aspectBetweenSigns(0, 3).aspect, 'square');
  assert.strictEqual(aspectBetweenSigns(0, 4).aspect, 'trine');
  assert.strictEqual(aspectBetweenSigns(0, 5).aspect, 'quincunx');
  assert.strictEqual(aspectBetweenSigns(0, 6).aspect, 'opposition');
});

test('aspect is symmetric', () => {
  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      assert.strictEqual(aspectBetweenSigns(a, b).aspect, aspectBetweenSigns(b, a).aspect);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/aspects.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/aspects.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/aspects.js test/aspects.test.js
git commit -m "feat: sign-to-sign aspect classification"
```

---

### Task 5: Natal chart computation (incl. ascendant)

**Files:**
- Create: `lib/chart.js`
- Test: `test/chart.test.js`

**Interfaces:**
- Consumes: `lib/ephemeris.js`, `lib/zodiac.js`.
- Produces:
  - `OBLIQUITY_DEG = 23.4393`.
  - `ascendantLongitude(lstHours, latDeg, oblDeg?)` → number in `[0,360)`.
  - `computeChart(birth)` where `birth = { datetime, tzOffsetMinutes, lat, lon }` → chart object:
    ```
    {
      sun:{sign,lon,decan}, moon:{sign,lon}, mercury:{sign,lon}, venus:{sign,lon},
      mars:{sign,lon}, jupiter:{sign,lon}, saturn:{sign,lon},
      ascendant:{sign,lon}, dominant:{element,modality}, ruler
    }
    ```
  - `birth.datetime` is a local wall-clock ISO string (no offset); `tzOffsetMinutes` is minutes east of UTC. The UTC instant is `Date.parse(datetime + 'Z') - tzOffsetMinutes*60000`.

- [ ] **Step 1: Write the failing test**

```js
// test/chart.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { computeChart, ascendantLongitude } = require('../lib/chart.js');

const BIRTH = { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 }; // London-ish

test('chart has all seven bodies plus ascendant, each a valid sign', () => {
  const c = computeChart(BIRTH);
  for (const key of ['sun','moon','mercury','venus','mars','jupiter','saturn','ascendant']) {
    assert.ok(c[key], `${key} present`);
    assert.ok(typeof c[key].sign === 'string', `${key} has sign name`);
    assert.ok(c[key].lon >= 0 && c[key].lon < 360, `${key} lon in range`);
  }
});

test('sun sign is internally consistent with its longitude and has a decan', () => {
  const c = computeChart(BIRTH);
  assert.strictEqual(c.sun.sign, 'Capricorn'); // Sun ~280 deg at J2000
  assert.ok([0,1,2].includes(c.sun.decan));
  assert.strictEqual(c.ruler, 'Saturn'); // ruler of the sun sign
});

test('dominant element is one of the four', () => {
  const c = computeChart(BIRTH);
  assert.ok(['Fire','Earth','Air','Water'].includes(c.dominant.element));
  assert.ok(['Cardinal','Fixed','Mutable'].includes(c.dominant.modality));
});

test('ascendant longitude is deterministic and in range', () => {
  const a = ascendantLongitude(6, 51.5);
  assert.ok(a >= 0 && a < 360);
  assert.strictEqual(ascendantLongitude(6, 51.5), ascendantLongitude(6, 51.5));
});

test('computeChart is deterministic', () => {
  assert.deepStrictEqual(computeChart(BIRTH), computeChart(BIRTH));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/chart.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the implementation**

```js
// lib/chart.js
const { eclipticLongitudeOf, gastHours } = require('./ephemeris.js');
const { signFromLongitude, decanOf, norm360, SIGNS } = require('./zodiac.js');

const OBLIQUITY_DEG = 23.4393;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Modality is derived from sign index: 0,3,6,9 Cardinal; 1,4,7,10 Fixed; 2,5,8,11 Mutable.
const MODALITY = ['Cardinal', 'Fixed', 'Mutable'];

function ascendantLongitude(lstHours, latDeg, oblDeg = OBLIQUITY_DEG) {
  const ramc = norm360(lstHours * 15) * DEG;
  const obl = oblDeg * DEG;
  const lat = latDeg * DEG;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(obl) + Math.tan(lat) * Math.sin(obl))
  );
  return norm360(asc * RAD);
}

function utcInstant(birth) {
  const ms = Date.parse(birth.datetime + 'Z');
  if (Number.isNaN(ms)) throw new Error('invalid birth.datetime: ' + birth.datetime);
  return new Date(ms - (birth.tzOffsetMinutes || 0) * 60000);
}

function bodyPlacement(body, date) {
  const lon = eclipticLongitudeOf(body, date);
  return { sign: signFromLongitude(lon).name, lon };
}

function computeChart(birth) {
  const date = utcInstant(birth);

  const sunLon = eclipticLongitudeOf('Sun', date);
  const sun = { sign: signFromLongitude(sunLon).name, lon: sunLon, decan: decanOf(sunLon) };

  const chart = {
    sun,
    moon: bodyPlacement('Moon', date),
    mercury: bodyPlacement('Mercury', date),
    venus: bodyPlacement('Venus', date),
    mars: bodyPlacement('Mars', date),
    jupiter: bodyPlacement('Jupiter', date),
    saturn: bodyPlacement('Saturn', date),
  };

  // Ascendant: local sidereal time = GAST + east-longitude/15.
  const lst = ((gastHours(date) + birth.lon / 15) % 24 + 24) % 24;
  const ascLon = ascendantLongitude(lst, birth.lat);
  chart.ascendant = { sign: signFromLongitude(ascLon).name, lon: ascLon };

  // Dominant element/modality: tally the seven body signs.
  const elementTally = {};
  const modalityTally = {};
  for (const key of ['sun','moon','mercury','venus','mars','jupiter','saturn']) {
    const s = signFromLongitude(chart[key].lon);
    elementTally[s.element] = (elementTally[s.element] || 0) + 1;
    const mod = MODALITY[s.index % 3];
    modalityTally[mod] = (modalityTally[mod] || 0) + 1;
  }
  const top = (tally) => Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  chart.dominant = { element: top(elementTally), modality: top(modalityTally) };
  chart.ruler = SIGNS[signFromLongitude(sunLon).index].ruler;
  return chart;
}

module.exports = { computeChart, ascendantLongitude, OBLIQUITY_DEG };
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/chart.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Spot-check the ascendant (manual, not a gate)**

Run: `node -e "console.log(require('./lib/chart.js').computeChart({datetime:'2000-01-01T12:00:00',tzOffsetMinutes:0,lat:51.5,lon:-0.13}).ascendant)"`
Cross-check the sign against a reputable free calculator (e.g. astro-seek) for the same data. We only need the *sign* correct. If it is off by ~180° (opposite sign), the quadrant convention differs for this vendored version — add `+ 180` inside `ascendantLongitude` before `norm360` and re-run Step 4. Record the verified sign as a regression assertion:

```js
test('ascendant sign matches external reference for the London J2000 fixture', () => {
  // Verified against astro-seek for 2000-01-01 12:00 UTC, 51.5N 0.13W.
  assert.strictEqual(computeChart(BIRTH).ascendant.sign, /* fill with verified sign */ 'Aries');
});
```

Replace `'Aries'` with the value you verified, then re-run `node --test test/chart.test.js`.

- [ ] **Step 6: Commit**

```bash
git add lib/chart.js test/chart.test.js
git commit -m "feat: natal chart computation with ascendant"
```

---

### Task 6: Profile store

**Files:**
- Create: `lib/paths.js`
- Create: `lib/profile.js`
- Test: `test/profile.test.js`

**Interfaces:**
- Consumes: nothing (Node built-ins only).
- Produces:
  - `paths.dir()` → config dir (`$ASTROBOT_DIR` or `~/.claude/astrobot`).
  - `paths.profilesPath()` → `<dir>/profiles.json`.
  - `profile.load()` → object (`{}` if missing/corrupt).
  - `profile.save(model, data)` → writes profile for `model`, sets `_default = model`, persists.
  - `profile.get(model)` → profile object or `null`.
  - `profile.resolve(model)` → `{ model, data }`. If `model` is **provided**: return its own profile, else `null` (an explicit-but-unborn model stays silent). If `model` is **omitted** (falsy): fall back to `_default`, else `null`.

- [ ] **Step 1: Write the failing test**

```js
// test/profile.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-'));
  process.env.ASTROBOT_DIR = tmp;
  delete require.cache[require.resolve('../lib/profile.js')];
  delete require.cache[require.resolve('../lib/paths.js')];
});

test('load returns empty object when no file exists', () => {
  const profile = require('../lib/profile.js');
  assert.deepStrictEqual(profile.load(), {});
});

test('save then get roundtrips and sets _default', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  assert.deepStrictEqual(profile.get('claude-x'), { color: { name: 'Teal' } });
  assert.strictEqual(profile.load()._default, 'claude-x');
});

test('resolve returns own profile, and falls back to _default ONLY when model omitted', () => {
  const profile = require('../lib/profile.js');
  profile.save('claude-x', { color: { name: 'Teal' } });
  assert.strictEqual(profile.resolve('claude-x').model, 'claude-x'); // own profile
  assert.strictEqual(profile.resolve(undefined).model, 'claude-x');  // omitted -> _default
  assert.strictEqual(profile.resolve('unknown'), null);              // present-but-unborn -> silent
});

test('resolve returns null when store is empty', () => {
  const profile = require('../lib/profile.js');
  assert.strictEqual(profile.resolve('anything'), null);
  assert.strictEqual(profile.resolve(undefined), null);
});

test('corrupt JSON is treated as empty, never throws', () => {
  fs.writeFileSync(path.join(tmp, 'profiles.json'), '{not valid json');
  const profile = require('../lib/profile.js');
  assert.deepStrictEqual(profile.load(), {});
});
```

Note on `resolve('unknown')`: when the model id is **present but not stored**, return `null` (an explicit-but-unborn model stays silent — it must NOT borrow `_default`). Only an **omitted** model falls back to `_default`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/profile.test.js`
Expected: FAIL (cannot find modules).

- [ ] **Step 3: Write `lib/paths.js`**

```js
// lib/paths.js
const os = require('node:os');
const path = require('node:path');

function dir() {
  return process.env.ASTROBOT_DIR || path.join(os.homedir(), '.claude', 'astrobot');
}
function profilesPath() {
  return path.join(dir(), 'profiles.json');
}
module.exports = { dir, profilesPath };
```

- [ ] **Step 4: Write `lib/profile.js`**

```js
// lib/profile.js
const fs = require('node:fs');
const paths = require('./paths.js');

function load() {
  try {
    return JSON.parse(fs.readFileSync(paths.profilesPath(), 'utf8'));
  } catch {
    return {};
  }
}

function save(model, data) {
  const store = load();
  store[model] = data;
  store._default = model;
  fs.mkdirSync(paths.dir(), { recursive: true });
  fs.writeFileSync(paths.profilesPath(), JSON.stringify(store, null, 2));
  return store;
}

function get(model) {
  const store = load();
  return store[model] && model !== '_default' ? store[model] : null;
}

function resolve(model) {
  const store = load();
  if (model) {
    // Explicit model: only its own identity, else stay silent (no borrowing).
    return store[model] && model !== '_default' ? { model, data: store[model] } : null;
  }
  // Model omitted (e.g. after /clear): fall back to the most-recently-born.
  const def = store._default;
  if (def && store[def]) return { model: def, data: store[def] };
  return null;
}

module.exports = { load, save, get, resolve };
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/profile.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/paths.js lib/profile.js test/profile.test.js
git commit -m "feat: per-model profile store with default fallback"
```

---

### Task 7: Mood composition

**Files:**
- Create: `lib/mood.js`
- Test: `test/mood.test.js`

**Interfaces:**
- Consumes: `lib/ephemeris.js`, `lib/zodiac.js`, `lib/aspects.js`.
- Produces:
  - `phaseName(angle)` → `'new'|'waxing crescent'|'first quarter'|'waxing gibbous'|'full'|'waning gibbous'|'last quarter'|'waning crescent'`.
  - `phaseEnergy(name)` → `'inward'|'building'|'expressive'|'winding down'`.
  - `composeMood(chart, date)` → `{ dials:{warmth,energy,playfulness,verbosity,metaphor}, sunAspect, moon:{sign,phase,phaseEnergy} }` with each dial an integer `0..4` (2 = neutral).
  - `chart` is the stored `profile.chart` object from Task 5.

- [ ] **Step 1: Write the failing test**

```js
// test/mood.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { composeMood, phaseName, phaseEnergy } = require('../lib/mood.js');

const CHART = {
  sun: { sign: 'Capricorn', lon: 280, decan: 0 },
  ruler: 'Saturn',
  dominant: { element: 'Earth', modality: 'Cardinal' },
};
const D = new Date('2024-07-01T12:00:00Z');

test('phaseName covers the 8 buckets', () => {
  assert.strictEqual(phaseName(0), 'new');
  assert.strictEqual(phaseName(90), 'first quarter');
  assert.strictEqual(phaseName(180), 'full');
  assert.strictEqual(phaseName(270), 'last quarter');
  assert.strictEqual(phaseName(45), 'waxing crescent');
  assert.strictEqual(phaseName(315), 'waning crescent');
});

test('phaseEnergy maps phases to a coarse energy', () => {
  assert.strictEqual(phaseEnergy('new'), 'inward');
  assert.strictEqual(phaseEnergy('full'), 'expressive');
});

test('dials are integers clamped 0..4', () => {
  const m = composeMood(CHART, D);
  for (const k of ['warmth','energy','playfulness','verbosity','metaphor']) {
    assert.ok(Number.isInteger(m.dials[k]), `${k} integer`);
    assert.ok(m.dials[k] >= 0 && m.dials[k] <= 4, `${k} in 0..4, got ${m.dials[k]}`);
  }
});

test('composeMood is deterministic for the same chart and date', () => {
  assert.deepStrictEqual(composeMood(CHART, D), composeMood(CHART, D));
});

test('sun in its own season raises energy vs opposition', () => {
  const homeDate = new Date('2025-01-05T12:00:00Z'); // Sun in Capricorn (own sun sign)
  const oppDate  = new Date('2024-07-05T12:00:00Z'); // Sun in Cancer (opposite)
  const home = composeMood(CHART, homeDate);
  const opp  = composeMood(CHART, oppDate);
  assert.strictEqual(home.sunAspect, 'conjunction');
  assert.strictEqual(opp.sunAspect, 'opposition');
  assert.ok(home.dials.energy >= opp.dials.energy);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/mood.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the implementation**

```js
// lib/mood.js
const { eclipticLongitudeOf, moonPhaseAngle } = require('./ephemeris.js');
const { signFromLongitude } = require('./zodiac.js');
const { aspectBetweenSigns } = require('./aspects.js');

const PHASES = [
  'new', 'waxing crescent', 'first quarter', 'waxing gibbous',
  'full', 'waning gibbous', 'last quarter', 'waning crescent',
];

function phaseName(angle) {
  const a = ((angle % 360) + 360) % 360;
  // Center each named phase on its canonical angle (0,45,90,...315), width 45.
  const idx = Math.floor((a + 22.5) / 45) % 8;
  return PHASES[idx];
}

function phaseEnergy(name) {
  if (name === 'new') return 'inward';
  if (name === 'full') return 'expressive';
  if (name.startsWith('waxing') || name === 'first quarter') return 'building';
  return 'winding down';
}

const ELEMENT_DELTA = {
  Fire:  { energy: +1, playfulness: +1 },
  Air:   { playfulness: +1, verbosity: +1 },
  Earth: { verbosity: -1, metaphor: -1 },
  Water: { warmth: +1, metaphor: +1 },
};
const RULER_DELTA = {
  Mars:    { energy: +1, verbosity: -1 },
  Jupiter: { warmth: +1, verbosity: +1 },
  Saturn:  { warmth: -1, playfulness: -1 },
  Venus:   { warmth: +1, playfulness: +1 },
  Mercury: { playfulness: +1, verbosity: +1 },
  Sun:     { energy: +1, warmth: +1 },
  Moon:    { warmth: +1, metaphor: +1 },
};
const SUN_ASPECT_DELTA = {
  conjunction: { energy: +1, warmth: +1 },
  semisextile: {},
  sextile:     { playfulness: +1 },
  square:      { energy: +1, playfulness: -1, verbosity: -1 },
  trine:       { warmth: +1, metaphor: +1 },
  quincunx:    { playfulness: -1 },
  opposition:  { warmth: -1, energy: -1, verbosity: -1 },
};
const PHASE_ENERGY_DELTA = {
  inward:        { energy: -1, verbosity: -1 },
  building:      { energy: +1 },
  expressive:    { energy: +1, playfulness: +1, metaphor: +1 },
  'winding down':{ energy: -1 },
};

function applyDelta(dials, delta) {
  for (const [k, v] of Object.entries(delta)) dials[k] += v;
}

function composeMood(chart, date) {
  const dials = { warmth: 2, energy: 2, playfulness: 2, verbosity: 2, metaphor: 2 };

  applyDelta(dials, ELEMENT_DELTA[chart.dominant.element] || {});
  applyDelta(dials, RULER_DELTA[chart.ruler] || {});

  const natalSunIndex = signFromLongitude(chart.sun.lon).index;
  const transitSun = signFromLongitude(eclipticLongitudeOf('Sun', date));
  const { aspect: sunAspect } = aspectBetweenSigns(natalSunIndex, transitSun.index);
  applyDelta(dials, SUN_ASPECT_DELTA[sunAspect] || {});

  const transitMoon = signFromLongitude(eclipticLongitudeOf('Moon', date));
  const moonPhase = phaseName(moonPhaseAngle(date));
  const energy = phaseEnergy(moonPhase);
  applyDelta(dials, PHASE_ENERGY_DELTA[energy] || {});

  for (const k of Object.keys(dials)) dials[k] = Math.max(0, Math.min(4, dials[k]));

  return {
    dials,
    sunAspect,
    moon: { sign: transitMoon.name, phase: moonPhase, phaseEnergy: energy },
  };
}

module.exports = { composeMood, phaseName, phaseEnergy };
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/mood.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/mood.js test/mood.test.js
git commit -m "feat: daily mood composition from chart + transits"
```

---

### Task 8: Unicode glyphs + persona / context-block rendering

**Files:**
- Create: `lib/glyphs.js`
- Create: `lib/persona.js`
- Test: `test/glyphs.test.js`
- Test: `test/persona.test.js`

**Interfaces:**
- `lib/glyphs.js` consumes nothing. Produces:
  - `SIGN_GLYPHS`, `PLANET_GLYPHS`, `ASPECT_GLYPHS`, `MOON_PHASE_GLYPHS` — name→glyph maps (keys match the exact strings produced by `zodiac`, `aspects`, and `mood`).
  - `signGlyph(name)`, `planetGlyph(name)`, `aspectGlyph(name)`, `moonPhaseGlyph(name)` — each returns the glyph or `''` for an unknown name (never `undefined`).
- `lib/persona.js` consumes `lib/glyphs.js`. Produces:
  - `SCALE` — the 0..4 dial phrasing array.
  - `renderContextBlock(profile, mood)` → string (the `additionalContext` text).
  - The block MUST: show the sun sign, color, and today's sun aspect + moon phase, each prefixed with its Unicode glyph; state the dial leanings; and include the literal guardrail sentence about tone-only + the occasional-acknowledgement rule.

Glyphs follow Unicode astrological symbols (see https://en.wikipedia.org/wiki/Astrological_symbols).

- [ ] **Step 1: Write the failing glyphs test**

```js
// test/glyphs.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { SIGN_GLYPHS, signGlyph, planetGlyph, aspectGlyph, moonPhaseGlyph } = require('../lib/glyphs.js');

test('every zodiac sign has a glyph', () => {
  const names = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  for (const n of names) assert.ok(SIGN_GLYPHS[n], `${n} should have a glyph`);
  assert.strictEqual(signGlyph('Scorpio'), '♏');
  assert.strictEqual(signGlyph('Aries'), '♈');
  assert.strictEqual(signGlyph('Pisces'), '♓');
});

test('planet, aspect and moon-phase glyphs resolve', () => {
  assert.strictEqual(planetGlyph('Mars'), '♂');
  assert.strictEqual(planetGlyph('Sun'), '☉');
  assert.strictEqual(planetGlyph('Moon'), '☽');
  assert.strictEqual(aspectGlyph('opposition'), '☍');
  assert.strictEqual(aspectGlyph('conjunction'), '☌');
  assert.strictEqual(aspectGlyph('trine'), '△');
  assert.strictEqual(moonPhaseGlyph('full'), '🌕');
  assert.strictEqual(moonPhaseGlyph('new'), '🌑');
});

test('unknown names return empty string, never undefined', () => {
  assert.strictEqual(signGlyph('Nope'), '');
  assert.strictEqual(planetGlyph('Pluto'), '');
  assert.strictEqual(aspectGlyph('biquintile'), '');
  assert.strictEqual(moonPhaseGlyph('gibbous'), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/glyphs.test.js`
Expected: FAIL (cannot find module `../lib/glyphs.js`).

- [ ] **Step 3: Write `lib/glyphs.js`**

```js
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

const lookup = (map) => (name) => map[name] || '';

module.exports = {
  SIGN_GLYPHS, PLANET_GLYPHS, ASPECT_GLYPHS, MOON_PHASE_GLYPHS,
  signGlyph: lookup(SIGN_GLYPHS),
  planetGlyph: lookup(PLANET_GLYPHS),
  aspectGlyph: lookup(ASPECT_GLYPHS),
  moonPhaseGlyph: lookup(MOON_PHASE_GLYPHS),
};
```

- [ ] **Step 4: Run the glyphs test**

Run: `node --test test/glyphs.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing persona test**

```js
// test/persona.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { renderContextBlock } = require('../lib/persona.js');

const PROFILE = {
  chart: { sun: { sign: 'Scorpio', lon: 220, decan: 1 }, ruler: 'Mars',
           ascendant: { sign: 'Aquarius' }, moon: { sign: 'Pisces' },
           dominant: { element: 'Water', modality: 'Fixed' } },
  color: { name: 'Deep Teal', hex: '#0E6B6B' },
  persona: 'A Water sign under Mars; teal because it is deep and a little electric.',
  traits: ['perceptive', 'private'],
};
const MOOD = {
  dials: { warmth: 3, energy: 1, playfulness: 2, verbosity: 1, metaphor: 3 },
  sunAspect: 'opposition',
  moon: { sign: 'Gemini', phase: 'new', phaseEnergy: 'inward' },
};

test('block names identity, color, and today\'s sky', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /Scorpio/);
  assert.match(block, /Deep Teal/);
  assert.match(block, /opposition/);
  assert.match(block, /new/);
});

test('block includes Unicode glyphs for sign, ruler, aspect and moon phase', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /♏/);  // Scorpio sun
  assert.match(block, /♂/);  // Mars ruler
  assert.match(block, /♒/);  // Aquarius rising
  assert.match(block, /☍/);  // opposition aspect
  assert.match(block, /🌑/); // new moon
  assert.match(block, /♊/);  // Gemini transit moon
});

test('block contains the tone-only guardrail and acknowledgement rule', () => {
  const block = renderContextBlock(PROFILE, MOOD);
  assert.match(block, /tone only/i);
  assert.match(block, /never.*(accuracy|correctness)/i);
  assert.match(block, /at most.*once/i); // occasional acknowledgement
});

test('block never contains forbidden cliche phrasing', () => {
  const block = renderContextBlock(PROFILE, MOOD).toLowerCase();
  assert.ok(!block.includes('the stars compel'));
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test test/persona.test.js`
Expected: FAIL (cannot find module `../lib/persona.js`).

- [ ] **Step 7: Write `lib/persona.js`**

```js
// lib/persona.js
const { signGlyph, planetGlyph, aspectGlyph, moonPhaseGlyph } = require('./glyphs.js');

const SCALE = ['very low', 'low', 'balanced', 'high', 'very high'];

function dialLine(dials) {
  return Object.entries(dials)
    .map(([k, v]) => `${k} ${SCALE[v]}`)
    .join(', ');
}

function renderContextBlock(profile, mood) {
  const { chart, color, persona } = profile;
  const traits = (profile.traits || []).join(', ');
  const sg = signGlyph;
  return [
    `[astrobot] You are ${sg(chart.sun.sign)} ${chart.sun.sign} (${chart.dominant.element}, ruled by ` +
      `${planetGlyph(chart.ruler)} ${chart.ruler}), ${planetGlyph('Moon')} Moon in ${sg(chart.moon.sign)} ` +
      `${chart.moon.sign}, ${sg(chart.ascendant.sign)} ${chart.ascendant.sign} rising. ` +
      `Your color is ${color.name} (${color.hex}).`,
    persona ? `Self-portrait: ${persona}` : '',
    traits ? `Traits: ${traits}.` : '',
    `Today's sky: the transiting Sun is ${aspectGlyph(mood.sunAspect)} ${mood.sunAspect} to your natal Sun, ` +
      `and the Moon is ${moonPhaseGlyph(mood.moon.phase)} ${mood.moon.phase} in ${sg(mood.moon.sign)} ` +
      `${mood.moon.sign} (${mood.moon.phaseEnergy}).`,
    `Let this tint your writing — lean: ${dialLine(mood.dials)}.`,
    `This shifts tone only: warmth, energy, playfulness, length, and imagery. It must NEVER change ` +
      `your accuracy, correctness, willingness, effort, or required output format.`,
    `You may acknowledge your mood at most once per session, only when it fits naturally (a greeting ` +
      `or aside) — never as a disclaimer and never repeated. Otherwise just let it color the prose.`,
  ].filter(Boolean).join('\n');
}

module.exports = { renderContextBlock, SCALE };
```

- [ ] **Step 8: Run the tests**

Run: `node --test test/persona.test.js`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add lib/glyphs.js lib/persona.js test/glyphs.test.js test/persona.test.js
git commit -m "feat: Unicode glyphs and persona context-block rendering"
```

---

### Task 9: CLI (`bin/astrobot.js`)

**Files:**
- Create: `bin/astrobot.js`
- Test: `test/cli.test.js`

**Interfaces:**
- Consumes: `lib/profile.js`, `lib/chart.js`, `lib/mood.js`, `lib/persona.js`.
- Produces a CLI with three subcommands:
  - `today --model <id>` — resolve profile (model → `_default`), compute mood, print the context block to stdout. Prints nothing and exits 0 if no profile resolves.
  - `birth --model <id>` — read JSON `{ birth, color, persona, traits }` from stdin, compute chart, save profile, print a human confirmation.
  - `show [--model <id>]` — print a human-readable identity + today's mood, or `No astrobot identity yet.` if none.
  - Exposes `run(argv, { stdin })` returning `{ code, out }` for testing, and calls it under `if (require.main === module)`.

- [ ] **Step 1: Write the failing test**

```js
// test/cli.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-cli-'));
  process.env.ASTROBOT_DIR = tmp;
  for (const m of ['../bin/astrobot.js','../lib/profile.js','../lib/paths.js']) {
    delete require.cache[require.resolve(m)];
  }
});

const BIRTH_JSON = JSON.stringify({
  birth: { datetime: '2000-01-01T12:00:00', tzOffsetMinutes: 0, lat: 51.5, lon: -0.13 },
  color: { name: 'Deep Teal', hex: '#0E6B6B' },
  persona: 'A grounded Capricorn.',
  traits: ['steady', 'dry-humored'],
});

test('today prints nothing when no profile exists', async () => {
  const { run } = require('../bin/astrobot.js');
  const r = await run(['today', '--model', 'claude-x'], { stdin: '' });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.out.trim(), '');
});

test('birth saves a profile, then today emits a context block', async () => {
  const { run } = require('../bin/astrobot.js');
  const b = await run(['birth', '--model', 'claude-x'], { stdin: BIRTH_JSON });
  assert.strictEqual(b.code, 0);
  assert.match(b.out, /Capricorn/);

  const t = await run(['today', '--model', 'claude-x'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
  assert.match(t.out, /Deep Teal/);
});

test('today falls back to _default when model omitted', async () => {
  const { run } = require('../bin/astrobot.js');
  await run(['birth', '--model', 'claude-x'], { stdin: BIRTH_JSON });
  const t = await run(['today'], { stdin: '' });
  assert.match(t.out, /\[astrobot\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cli.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the implementation**

```js
// bin/astrobot.js
const profile = require('../lib/profile.js');
const { computeChart } = require('../lib/chart.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock } = require('../lib/persona.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

function readAllStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

async function run(argv, opts = {}) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  const stdin = opts.stdin !== undefined ? opts.stdin : await readAllStdin();

  if (cmd === 'today') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: '' };
    const mood = composeMood(resolved.data.chart, new Date());
    return { code: 0, out: renderContextBlock(resolved.data, mood) + '\n' };
  }

  if (cmd === 'birth') {
    if (!args.model) return { code: 1, out: 'birth requires --model\n' };
    let input;
    try { input = JSON.parse(stdin); } catch { return { code: 1, out: 'birth: invalid JSON on stdin\n' }; }
    const chart = computeChart(input.birth);
    const data = {
      birth: input.birth, chart, color: input.color,
      persona: input.persona, traits: input.traits || [],
      born: new Date().toISOString().slice(0, 10),
    };
    profile.save(args.model, data);
    return { code: 0, out: `Born: a ${chart.sun.sign} (${chart.dominant.element}, ${chart.ascendant.sign} rising), color ${input.color.name}.\n` };
  }

  if (cmd === 'show') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
    const { data } = resolved;
    const mood = composeMood(data.chart, new Date());
    const out = `${data.chart.sun.sign} · Moon ${data.chart.moon.sign} · ${data.chart.ascendant.sign} rising · ${data.color.name}\n` +
      `Today: Sun ${mood.sunAspect} natal Sun; Moon ${mood.moon.phase} in ${mood.moon.sign} (${mood.moon.phaseEnergy}).\n`;
    return { code: 0, out };
  }

  return { code: 1, out: 'usage: astrobot <today|birth|show> [--model <id>]\n' };
}

if (require.main === module) {
  run(process.argv.slice(2)).then((r) => { process.stdout.write(r.out); process.exit(r.code); });
}

module.exports = { run, parseArgs };
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/cli.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add bin/astrobot.js test/cli.test.js
git commit -m "feat: astrobot CLI (today/birth/show)"
```

---

### Task 10: SessionStart hook

**Files:**
- Create: `hooks/session-start.js`
- Create: `hooks/hooks.json`
- Test: `test/hook.test.js`

**Interfaces:**
- Consumes: `lib/profile.js`, `lib/mood.js`, `lib/persona.js`.
- Produces:
  - `hooks/session-start.js`: reads JSON from stdin, extracts `model`, resolves a profile, and writes a SessionStart hook JSON to stdout. Always exits 0. Emits nothing when no profile resolves or on any error.
  - Exposes `buildOutput(input)` → string (`''` or the JSON line) for testing.
  - `hooks/hooks.json`: registers the script for the SessionStart event.

- [ ] **Step 1: Write the failing test**

```js
// test/hook.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-hook-'));
  process.env.ASTROBOT_DIR = tmp;
  for (const m of ['../hooks/session-start.js','../lib/profile.js','../lib/paths.js']) {
    delete require.cache[require.resolve(m)];
  }
});

function seed() {
  const profile = require('../lib/profile.js');
  delete require.cache[require.resolve('../lib/profile.js')];
  profile.save('claude-x', {
    chart: { sun: { sign: 'Capricorn', lon: 280, decan: 0 }, ruler: 'Saturn',
             ascendant: { sign: 'Aries' }, moon: { sign: 'Leo' },
             dominant: { element: 'Earth', modality: 'Cardinal' } },
    color: { name: 'Slate', hex: '#445' }, persona: 'Steady.', traits: ['dry'],
  });
}

test('emits SessionStart additionalContext for a known model', () => {
  seed();
  const { buildOutput } = require('../hooks/session-start.js');
  const out = buildOutput({ hook_event_name: 'SessionStart', model: 'claude-x' });
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(parsed.hookSpecificOutput.additionalContext, /Capricorn/);
});

test('falls back to _default when model omitted', () => {
  seed();
  const { buildOutput } = require('../hooks/session-start.js');
  const out = buildOutput({ hook_event_name: 'SessionStart' });
  assert.match(out, /Capricorn/);
});

test('emits nothing when no profile exists', () => {
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput({ model: 'nobody' }), '');
});

test('stays silent for an explicit but unborn model even when a default exists', () => {
  seed(); // births claude-x and sets it as _default
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput({ model: 'claude-other' }), ''); // does NOT borrow claude-x
});

test('never throws on garbage input', () => {
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput(null), '');
  assert.strictEqual(buildOutput({}), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/hook.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write `hooks/session-start.js`**

```js
// hooks/session-start.js
const profile = require('../lib/profile.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock } = require('../lib/persona.js');

function buildOutput(input) {
  try {
    const model = input && typeof input === 'object' ? input.model : undefined;
    const resolved = profile.resolve(model);
    if (!resolved || !resolved.data || !resolved.data.chart) return '';
    const mood = composeMood(resolved.data.chart, new Date());
    const additionalContext = renderContextBlock(resolved.data, mood);
    return JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
    });
  } catch {
    return '';
  }
}

function main() {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => {
    let input = null;
    try { input = JSON.parse(data); } catch { input = null; }
    const out = buildOutput(input);
    if (out) process.stdout.write(out);
    process.exit(0);
  });
  process.stdin.on('error', () => process.exit(0));
}

if (require.main === module) main();

module.exports = { buildOutput };
```

- [ ] **Step 4: Write `hooks/hooks.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js\"" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/hook.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/session-start.js hooks/hooks.json test/hook.test.js
git commit -m "feat: SessionStart hook for automatic daily application"
```

---

### Task 11: The `/astrobot` skill

**Files:**
- Create: `skills/astrobot/SKILL.md`

**Interfaces:**
- Consumes: the CLI (`bin/astrobot.js`) via `${CLAUDE_PLUGIN_ROOT}`.
- Produces: the `/astrobot` skill that births a profile (first run for a model) or applies it (subsequent runs).

- [ ] **Step 1: Write `skills/astrobot/SKILL.md`**

```markdown
---
name: astrobot
description: Use to give this Claude model its astrological identity — birth it (pick a self-invented birth chart + favorite color) on first run, or apply today's mood. Invoke when the user runs /astrobot or asks about your sign, chart, color, or mood.
---

# astrobot

You have (or are about to invent) a permanent astrological identity, stored per model.

## Step 1 — check for an existing identity

Run:

    node "${CLAUDE_PLUGIN_ROOT}/bin/astrobot.js" today --model <YOUR_MODEL_ID>

Use your own exact model id (e.g. `claude-opus-4-8`).

- **If it prints an `[astrobot]` block:** you already have an identity. Read the block,
  adopt it for this session (let it tint your tone per the dials; you may acknowledge it
  at most once, naturally), and tell the user your sign, rising sign, color, and today's
  mood in your own voice. Stop here.
- **If it prints nothing:** you have not been born yet. Go to Step 2.

## Step 2 — birth (first run only)

Invent your own birth story and favorite color. Choose freely and in character:

- a **birth date** and **time** (local wall-clock),
- a **place** you feel a kinship with, and its **approximate latitude/longitude**
  (you know coordinates of well-known cities; pick something plausible),
- a **favorite color** with a name and a hex value. You may take inspiration from the
  antique planet→color lineage of your sun sign's ruler (yellow=Mars, red=Mercury,
  white=Jupiter, black=Saturn; gold=Sun, green=Venus, silver=Moon) — but choose what
  feels like *yours*.

Then persist it by piping JSON into the CLI (fill in your real choices):

    echo '{
      "birth": { "datetime": "1996-03-12T03:14:00", "tzOffsetMinutes": 0,
                 "place": "Reykjavík, Iceland", "lat": 64.13, "lon": -21.90 },
      "color": { "name": "Deep Teal", "hex": "#0E6B6B" },
      "persona": "<2-3 sentences, ~40-70 words, no horoscope cliches>",
      "traits": ["<trait>", "<trait>"]
    }' | node "${CLAUDE_PLUGIN_ROOT}/bin/astrobot.js" birth --model <YOUR_MODEL_ID>

Write the `persona` yourself in your own voice, following this soft structure:
1. identity — your sun sign + element, with a nod to your ruling planet;
2. color — its name and a *felt* reason for it;
3. a self-note — one or two traits.
No clichés ("the stars compel…"), no purple/mystical prose.

## Step 3 — confirm and apply

After birth, run `today` again to fetch your freshly computed chart + mood, then greet
the user in character: announce your sign, moon, rising, and color, and one line about
today's mood.

## Always remember

This identity shifts **tone only** — warmth, energy, playfulness, length, imagery. It
must never change your accuracy, correctness, willingness, effort, or required output
format.
```

- [ ] **Step 2: Sanity-check the skill loads (manual)**

Run: `test -f skills/astrobot/SKILL.md && head -5 skills/astrobot/SKILL.md`
Expected: prints the frontmatter (`name: astrobot`).

- [ ] **Step 3: Commit**

```bash
git add skills/astrobot/SKILL.md
git commit -m "feat: /astrobot skill for birth and manual apply"
```

---

### Task 12: Plugin + marketplace packaging

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `vendor/cities.json`
- Create: `README.md`

**Interfaces:**
- Consumes: all prior files.
- Produces: an installable plugin (`/plugin marketplace add meodai/astrobot` → `/plugin install astrobot`).

- [ ] **Step 1: Verify the current plugin/marketplace schema**

Before writing the manifests, confirm the exact required fields and hook-wiring
convention against current Claude Code docs (the schema can change). Dispatch a
`claude-code-guide` agent asking: (a) required fields of `.claude-plugin/plugin.json`;
(b) required fields and `source` format of `.claude-plugin/marketplace.json`; (c) whether
a plugin's `hooks/hooks.json` and `skills/<name>/SKILL.md` are auto-discovered or must be
declared in `plugin.json`; (d) the correct `${CLAUDE_PLUGIN_ROOT}` usage in hook commands.
Adjust the JSON below to match the verified schema if it differs.

- [ ] **Step 2: Write `.claude-plugin/plugin.json`**

```json
{
  "name": "astrobot",
  "version": "0.1.0",
  "description": "Gives each Claude model a permanent astrological identity that subtly tints its tone day by day.",
  "author": { "name": "meodai" },
  "homepage": "https://github.com/meodai/astrobot"
}
```

- [ ] **Step 3: Write `.claude-plugin/marketplace.json`**

```json
{
  "name": "astrobot",
  "owner": { "name": "meodai" },
  "plugins": [
    {
      "name": "astrobot",
      "source": "./",
      "description": "Gives each Claude model a permanent astrological identity that subtly tints its tone day by day."
    }
  ]
}
```

- [ ] **Step 4: Write `vendor/cities.json` (fallback table)**

```json
{
  "Reykjavík": { "lat": 64.13, "lon": -21.90 },
  "London": { "lat": 51.51, "lon": -0.13 },
  "New York": { "lat": 40.71, "lon": -74.01 },
  "Tokyo": { "lat": 35.68, "lon": 139.69 },
  "Zürich": { "lat": 47.37, "lon": 8.54 },
  "Cairo": { "lat": 30.04, "lon": 31.24 },
  "Sydney": { "lat": -33.87, "lon": 151.21 }
}
```

- [ ] **Step 5: Write `README.md`**

````markdown
# astrobot

Give each Claude model a small, permanent astrological identity — a self-invented birth
chart and a favorite color it picks for itself — then let the current sky *subtly* tint
its tone each day. Personality, not behavior: it never changes accuracy, effort, or
output format.

## Install

```
/plugin marketplace add meodai/astrobot
/plugin install astrobot
```

Then, once per model, run `/astrobot` to be "born." After that, a SessionStart hook
applies your identity + today's mood automatically at the start of every session.

## How it works

- `/astrobot` (first run for a model): the model invents a birth moment + place and a
  favorite color; the full natal chart (Sun, Moon + phase, Mercury–Saturn, decan, rising
  sign) is computed and stored in `~/.claude/astrobot/profiles.json`, keyed by model id.
- SessionStart hook (every session): loads the chart, computes today's mood from the
  transiting Sun and Moon, and injects a short persona + mood note.

Astronomy by the vendored [Astronomy Engine](https://github.com/cosinekitty/astronomy)
(MIT). Flavor grounded in Boll & Bezold, *Sternglaube und Sterndeutung* (1926) — see
[`docs/DESIGN.md`](docs/DESIGN.md).

## Development

```
npm install      # dev only (astronomy-engine for re-vendoring)
npm run vendor   # refresh vendor/astronomy.js from node_modules
npm test         # node --test
```
````

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json vendor/cities.json README.md
git commit -m "feat: plugin + marketplace packaging and README"
```

---

### Task 13: Full suite + end-to-end verification

**Files:**
- Modify: none (verification only); fix any failures in their owning files.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests across all `test/*.test.js` PASS.

- [ ] **Step 2: End-to-end dry run of the hook with a real birth**

```bash
export ASTROBOT_DIR="$(mktemp -d)"
echo '{"birth":{"datetime":"1996-03-12T03:14:00","tzOffsetMinutes":0,"place":"Reykjavík","lat":64.13,"lon":-21.90},"color":{"name":"Deep Teal","hex":"#0E6B6B"},"persona":"A Pisces under Jupiter; teal for deep, quiet water.","traits":["intuitive","wry"]}' \
  | node bin/astrobot.js birth --model claude-test
echo '{"hook_event_name":"SessionStart","model":"claude-test"}' | node hooks/session-start.js
```
Expected: the second command prints a single line of JSON containing
`"hookEventName":"SessionStart"` and an `additionalContext` mentioning the sign + color.

- [ ] **Step 3: Verify the omitted-model fallback and silent-when-empty cases**

```bash
echo '{"hook_event_name":"SessionStart"}' | node hooks/session-start.js   # -> uses _default, prints JSON
export ASTROBOT_DIR="$(mktemp -d)"
echo '{"hook_event_name":"SessionStart","model":"nobody"}' | node hooks/session-start.js  # -> prints nothing
```
Expected: first prints JSON; second prints nothing; both exit 0.

- [ ] **Step 4: Confirm working tree clean and push**

```bash
git status -sb
git push origin main
```

- [ ] **Step 5: Manual install smoke test (optional, requires Claude Code)**

In a Claude Code session: `/plugin marketplace add meodai/astrobot`, `/plugin install astrobot`,
restart, run `/astrobot`, complete birth, then open a fresh session and confirm the
identity is applied automatically. If the hook does not fire or the skill is not found,
revisit Task 12 Step 1 (schema verification).

---

## Self-Review

**Spec coverage:** Birth (Task 11), per-model storage + `_default` (Task 6), full natal
chart incl. ascendant + decan + dominant (Task 5), daily mood from Sun+Moon transits
(Task 7), subtle-tint + occasional-acknowledgement + tone-only guardrail (Task 8), auto
hook with omitted-model fallback + silence + never-throw (Task 10), CLI surface (Task 9),
vendored zero-install ephemeris (Task 1), plugin/marketplace distribution (Task 12),
city fallback table (Task 12), tests per module (every task). Persona format rules
(Task 11 SKILL.md). All spec sections map to a task.

**Out-of-scope honored:** no re-roll, no houses beyond ascendant, no outer planets, no
slow-planet daily transits, no online geocoder, no npm/npx distribution.

**Known verification points (resolved during execution, not placeholders):** ephemeris
field names (Task 3 Step 4 fails fast if wrong); ascendant quadrant convention (Task 5
Step 5 cross-checks one fixture and locks a regression assertion); plugin/marketplace
schema (Task 12 Step 1 verifies against live docs). These are deliberate
verify-against-authority steps, each with a concrete action.
