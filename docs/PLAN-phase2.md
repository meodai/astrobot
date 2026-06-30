# astrobot Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add cross-LLM "portable mode" (a CLI that emits a paste-able persona block) and a GitHub Pages microsite (interactive in-browser chart/mood playground + a gallery of real example profiles) that reuses the existing engine.

**Architecture:** Portable mode is a thin CLI command + a portable persona renderer over the existing `lib/`. The microsite runs the SAME engine in the browser via an esbuild bundle of the pure modules (chart, mood, glyphs, persona + vendored ephemeris); a static `site/` (vintage-celestial design) drives it. Deploy via a GitHub Actions workflow that builds the bundle and publishes `site/` to Pages.

**Tech Stack:** Node.js (CommonJS) engine; esbuild (new **devDependency**) for the browser bundle; static HTML/CSS/JS for the site; GitHub Actions for deploy. Tests: `node:test`.

## Global Constraints

- **No new runtime deps.** esbuild is **devDependency-only** (build-time). The plugin runtime stays zero-dep + vendored ephemeris.
- **DRY engine.** The microsite must bundle the real `lib/` modules — do NOT reimplement chart/mood/glyph/persona logic in browser code.
- **Browser bundle imports ONLY pure modules** (`lib/chart`, `lib/mood`, `lib/glyphs`, `lib/persona`, transitively `lib/zodiac`, `lib/ephemeris`, `lib/aspects`, `vendor/astronomy.js`). It must NOT import `lib/profile.js`, `lib/paths.js`, or `lib/places.js` (they use Node `fs`). The playground passes explicit `lat`/`lon`, so coordinate fallback is not needed in-browser.
- **Persona honesty on the site:** any persona text generated live in the playground is templated structure (no LLM call); it must be visibly labeled as such. The gallery shows real LLM-authored personas from `site/gallery.json`.
- **Tone-only framing** carries into portable mode: the exported block keeps the "tone only; never accuracy/correctness/willingness/effort/format" guardrail.
- **CommonJS** for engine/CLI; the browser entry may use `require` (esbuild bundles it).
- **Vintage-celestial aesthetic:** gold-on-dark, antique woodcut/ink feel echoing Boll & Bezold; real Unicode astrological glyphs. Use the `frontend-design` skill for the UI task.

---

### Task 1: Portable mode — `astrobot export` + portable persona renderer

**Files:**
- Modify: `lib/persona.js` (add `renderPortableBlock`)
- Modify: `bin/astrobot.js` (add `export` command)
- Modify: `test/persona.test.js`, `test/cli.test.js`
- Modify: `README.md` (add "Use with other LLMs")

**Interfaces:**
- Produces: `renderPortableBlock(profile, mood)` → string: a self-contained system-prompt block suitable for ANY LLM (no Claude-Code/`[astrobot]` framing). Reuses the identity + mood + guardrail wording from `renderContextBlock` but with a portable preamble line and no hook-specific phrasing.
- `astrobot export [--model <id>]` → prints the portable block (resolve like `today`: model → `_default`); prints `No astrobot identity yet.` + code 0 if none.

- [ ] **Step 1: Write failing tests (persona)**

Add to `test/persona.test.js`:
```js
const { renderPortableBlock } = require('../lib/persona.js');

test('portable block carries identity, mood, glyphs and the tone-only guardrail, without [astrobot] framing', () => {
  const block = renderPortableBlock(PROFILE, MOOD);
  assert.match(block, /Scorpio/);
  assert.match(block, /♏/);
  assert.match(block, /opposition/);
  assert.match(block, /tone only/i);
  assert.match(block, /never.*(accuracy|correctness)/i);
  assert.ok(!block.includes('[astrobot]'));
});
```

- [ ] **Step 2: Run it, confirm fail**

Run: `node --test test/persona.test.js` → FAIL (`renderPortableBlock` not a function).

- [ ] **Step 3: Implement `renderPortableBlock`**

In `lib/persona.js`, add (reusing the existing `SCALE`/`dialLine` and glyph helpers already in the file — do not duplicate them):
```js
function renderPortableBlock(profile, mood) {
  const { chart, color, persona } = profile;
  const traits = (profile.traits || []).join(', ');
  return [
    `You have a small, fixed astrological persona. Let it gently color your tone in this conversation.`,
    `Identity: ${signGlyph(chart.sun.sign)} ${chart.sun.sign} (${chart.dominant.element}, ruled by ` +
      `${planetGlyph(chart.ruler)} ${chart.ruler}), ${planetGlyph('Moon')} Moon in ${signGlyph(chart.moon.sign)} ` +
      `${chart.moon.sign}, ${signGlyph(chart.ascendant.sign)} ${chart.ascendant.sign} rising. ` +
      `Favorite color: ${color.name} (${color.hex}).`,
    persona ? `Self-portrait: ${persona}` : '',
    traits ? `Traits: ${traits}.` : '',
    `Today: the Sun is ${aspectGlyph(mood.sunAspect)} ${mood.sunAspect} to your natal Sun; the Moon is ` +
      `${moonPhaseGlyph(mood.moon.phase)} ${mood.moon.phase} in ${signGlyph(mood.moon.sign)} ${mood.moon.sign}. ` +
      `Lean: ${dialLine(mood.dials)}.`,
    `This shifts TONE ONLY — warmth, energy, playfulness, length, imagery. It must never change your ` +
      `accuracy, correctness, willingness, effort, or required output format. You may mention your mood ` +
      `at most once, only if it fits naturally.`,
  ].filter(Boolean).join('\n');
}
```
Export it alongside `renderContextBlock`.

- [ ] **Step 4: Run persona tests** → PASS.

- [ ] **Step 5: Write failing CLI test**

Add to `test/cli.test.js`:
```js
test('export prints a portable block for a born model, nothing-ish when absent', async () => {
  const { run } = require('../bin/astrobot.js');
  const none = await run(['export', '--model', 'x'], { stdin: '' });
  assert.match(none.out, /No astrobot identity yet/);
  await run(['birth', '--model', 'x'], { stdin: BIRTH_JSON });
  const got = await run(['export', '--model', 'x'], { stdin: '' });
  assert.ok(!got.out.includes('[astrobot]'));
  assert.match(got.out, /tone only/i);
});
```

- [ ] **Step 6: Run it, confirm fail.**

- [ ] **Step 7: Add the `export` command** to `bin/astrobot.js` (mirror the `today` branch but use `renderPortableBlock`; import it):
```js
if (cmd === 'export') {
  const resolved = profile.resolve(args.model);
  if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
  const mood = composeMood(resolved.data.chart, new Date());
  return { code: 0, out: renderPortableBlock(resolved.data, mood) + '\n' };
}
```
Update the usage string to include `export`.

- [ ] **Step 8: Run full suite** (`npm test`) → all pass.

- [ ] **Step 9: README — add "Use with other LLMs"** section:
````markdown
## Use with other LLMs

astrobot's identity is portable. After a model is born, print a paste-able persona block:

```
node bin/astrobot.js export --model <id>
```

Paste the output into any assistant's system prompt (ChatGPT, Gemini, etc.). The block is
self-contained and carries the same tone-only guardrail. (Automatic per-session application
is Claude Code-only, via the plugin's hook.)
````

- [ ] **Step 10: Commit**
```bash
git add lib/persona.js bin/astrobot.js test/persona.test.js test/cli.test.js README.md
git commit -m "feat: portable mode — astrobot export + portable persona block"
```

---

### Task 2: Browser bundle of the engine (esbuild)

**Files:**
- Modify: `package.json` (devDependency esbuild, `build:site` script)
- Create: `site/src/engine.js` (browser entry)
- Create: `site/astrobot.bundle.js` (build output — committed so the site works without CI too)
- Test: `test/bundle.test.js`

**Interfaces:**
- Build: `npm run build:site` → bundles `site/src/engine.js` into `site/astrobot.bundle.js` as an IIFE exposing `globalThis.Astrobot`.
- `globalThis.Astrobot` = `{ computeChart, composeMood, renderContextBlock, SIGNS, glyphs, CITIES }` where `glyphs` is the glyphs module and `CITIES` is the parsed `vendor/cities.json` (imported as JSON, NOT via fs).

- [ ] **Step 1: Add esbuild devDependency + build script**

In `package.json` add to `devDependencies`: `"esbuild": "^0.21.0"`, and to `scripts`:
```json
"build:site": "esbuild site/src/engine.js --bundle --format=iife --global-name=Astrobot --outfile=site/astrobot.bundle.js"
```
Run `npm install`.

- [ ] **Step 2: Write the browser entry `site/src/engine.js`**
```js
// Browser entry — bundles the real engine (pure modules only) for the microsite.
const { computeChart } = require('../../lib/chart.js');
const { composeMood } = require('../../lib/mood.js');
const { renderContextBlock } = require('../../lib/persona.js');
const { SIGNS } = require('../../lib/zodiac.js');
const glyphs = require('../../lib/glyphs.js');
const CITIES = require('../../vendor/cities.json');

module.exports = { computeChart, composeMood, renderContextBlock, SIGNS, glyphs, CITIES };
```
(esbuild's `--global-name=Astrobot` exposes `module.exports` as `globalThis.Astrobot`.)

- [ ] **Step 3: Build it**

Run: `npm run build:site` → confirm `site/astrobot.bundle.js` is created (non-empty).

- [ ] **Step 4: Write a bundle smoke test `test/bundle.test.js`**

The bundle is an IIFE assigning to a global. Evaluate it in a fresh context and check the API + a real computation:
```js
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
```
If the global-capture line is fragile for the chosen esbuild output, adjust the capture (the assertion targets are fixed: `computeChart` works, Capricorn sun, Aries ascendant, London in CITIES).

- [ ] **Step 5: Run** `node --test test/bundle.test.js` → PASS. Then full suite → PASS.

- [ ] **Step 6: Commit** (include the built bundle)
```bash
git add package.json package-lock.json site/src/engine.js site/astrobot.bundle.js test/bundle.test.js
git commit -m "feat: esbuild browser bundle of the engine for the microsite"
```

---

### Task 3: Gallery data (`site/gallery.json`)

**Files:**
- Create: `scripts/gen-gallery.js` (computes charts for fixed birth data)
- Create: `site/gallery.json` (final, with controller-authored personas)

**Note:** The CONTROLLER authors the persona/color/traits for each entry (these are the "real LLM-written" examples) and supplies the birth data; this task wires the generator and commits the data. The persona strings will be provided to the implementer in the task brief / by the controller — do not invent new ones.

- [ ] **Step 1: Write `scripts/gen-gallery.js`** that, for an array of `{label, model, birth, color, persona, traits}` entries, computes each chart via `lib/chart.js` and a sample-day mood via `lib/mood.js` for a fixed date, and writes `site/gallery.json` as `[{label, model, birth, chart, color, persona, traits, sample:{date, mood}}]`. Use a FIXED sample date passed in (no `new Date()`), e.g. `'2026-06-30T12:00:00Z'`, so output is deterministic.

- [ ] **Step 2: Run it** to produce `site/gallery.json`; confirm valid JSON with `node -e "JSON.parse(require('fs').readFileSync('site/gallery.json','utf8')).length"` prints the entry count.

- [ ] **Step 3: Commit**
```bash
git add scripts/gen-gallery.js site/gallery.json
git commit -m "feat: gallery dataset of example profiles (real charts + authored personas)"
```

---

### Task 4: Microsite UI (vintage-celestial) — playground + gallery + chart wheel

**Files:**
- Modify: `package.json` (add `@astrodraw/astrochart` devDependency; split build scripts)
- Create: `site/src/astrochart.js` (browser entry for the chart library)
- Create: `site/astrochart.bundle.js` (build output — committed)
- Create: `site/index.html`
- Create: `site/styles.css`
- Create: `site/app.js`
- Create: `site/.nojekyll` (empty — prevents Jekyll processing on Pages)

**REQUIRED SUB-SKILL for this task:** invoke the `frontend-design` skill before writing CSS/markup; the design must be distinctive (vintage-celestial: gold-on-dark, antique woodcut/ink, real astrological glyphs), not a templated default.

**Interfaces:** consumes `site/astrobot.bundle.js` (`globalThis.Astrobot`), `site/astrochart.bundle.js` (`globalThis.astrology` — the AstroChart library), and `site/gallery.json` (fetched).

- [ ] **Step 1: Bundle AstroChart (site-only devDep)**

Add `"@astrodraw/astrochart": "^4.1.0"` to `devDependencies` and refactor the `scripts` so a single command builds BOTH bundles:
```json
"build:engine": "esbuild site/src/engine.js --bundle --format=iife --global-name=Astrobot --outfile=site/astrobot.bundle.js",
"build:astrochart": "esbuild site/src/astrochart.js --bundle --format=iife --global-name=astrology --outfile=site/astrochart.bundle.js",
"build:site": "npm run build:engine && npm run build:astrochart"
```
Run `npm install`. Create `site/src/astrochart.js`:
```js
// Browser entry — bundles the AstroChart SVG chart library as global `astrology`.
module.exports = require('@astrodraw/astrochart');
```
Run `npm run build:site` and confirm BOTH `site/astrobot.bundle.js` and `site/astrochart.bundle.js` exist and are non-empty. (If the package's default export shape differs, adjust `site/src/astrochart.js` so the bundle's global exposes a usable `Chart` constructor — verify with `node -e "const a=require('@astrodraw/astrochart'); console.log(Object.keys(a))"`.)

- [ ] **Step 2: `index.html`** — loads `astrobot.bundle.js`, `astrochart.bundle.js`, then `app.js`; two sections: **Playground** and **Gallery**; a header explaining astrobot in one sentence with a link to the repo.

- [ ] **Step 3: Whole-sign house helper + chart-wheel renderer (`app.js`)**

Add a pure helper that turns the engine chart into AstroChart's data shape using **whole-sign houses** from the ascendant (no fabricated MC):
```js
function wheelData(chart) {
  const ascSignStart = Math.floor(chart.ascendant.lon / 30) * 30;
  const cusps = Array.from({ length: 12 }, (_, i) => (ascSignStart + 30 * i) % 360);
  return {
    planets: {
      Sun: [chart.sun.lon], Moon: [chart.moon.lon], Mercury: [chart.mercury.lon],
      Venus: [chart.venus.lon], Mars: [chart.mars.lon], Jupiter: [chart.jupiter.lon],
      Saturn: [chart.saturn.lon],
    },
    cusps,
  };
}
```
Render with a gold-on-dark theme and aspect lines:
```js
function drawWheel(elementId, chart, size) {
  const el = document.getElementById(elementId);
  el.innerHTML = '';
  const settings = { /* gold-on-dark COLORS_SIGNS, line/stroke/background, SYMBOL_SCALE */ };
  const data = wheelData(chart);
  const radix = new astrology.Chart(elementId, size, size, settings).radix(data);
  radix.addPointsOfInterest({ As: [data.cusps[0]], Ds: [data.cusps[6]] });
  radix.aspects();
}
```
Theme `settings` to match the vintage-celestial palette (gold strokes/symbols on the dark ground). Below each wheel, a small note: **"Whole-sign houses from the ascendant (full Placidus houses are a future enhancement)."**

- [ ] **Step 4: Playground (`app.js` + markup)** — controls: birth date, birth time, city `<select>` (populated from `Astrobot.CITIES`) or manual lat/lon, a favorite-color input (default-suggested from the sun-sign ruler's antique color), and a **"today" date scrubber**. On any change: call `Astrobot.computeChart` then `Astrobot.composeMood(chart, scrubDate)`; render:
  - the **chart wheel** via `drawWheel(...)`;
  - the natal chart text: each placement as `glyph Sign` (Sun/Moon/Mercury–Saturn, decan, ascendant, dominant element/modality) using `Astrobot.glyphs`;
  - a color swatch;
  - the mood dials as labeled bars (warmth/energy/playfulness/verbosity/metaphor, 0–4);
  - the rendered block via `Astrobot.renderContextBlock`, under a clear label: **"Structure the LLM fills in (persona text here is a placeholder — real personas are LLM-written, see the gallery)."**

- [ ] **Step 5: Gallery** — `fetch('gallery.json')` and render a card per entry: a **compact chart wheel** (`drawWheel` from `entry.chart`), sign glyph + name, color swatch, the real persona text, a compact chart summary, and the sample-day mood. Handle fetch failure gracefully (show a message, don't blank the page).

- [ ] **Step 6: Styles (`site/styles.css`)** — vintage-celestial per the frontend-design pass: dark ground, gold/parchment ink, a display face for headings + readable body face (system stacks or Google Fonts via `<link>`), glyphs prominent, the chart wheels framed like plates, subtle star/woodcut texture allowed but keep it legible and fast. Responsive (works on the phone screenshot width).

- [ ] **Step 7: Manual check** — `npm run build:site` (ensure both bundles fresh), then serve `site/` (`python3 -m http.server` in `site/`) and confirm: changing inputs updates the wheel + chart + mood live; the scrubber changes the mood; both bundles load; the gallery renders cards with wheels. Describe the verification in the report (note: open via http server, not file://, so `fetch('gallery.json')` works).

- [ ] **Step 8: Commit**
```bash
git add package.json package-lock.json site/src/astrochart.js site/astrochart.bundle.js site/index.html site/styles.css site/app.js site/.nojekyll
git commit -m "feat: microsite UI — playground + gallery with AstroChart wheel (vintage-celestial)"
```

---

### Task 5: GitHub Actions → Pages deploy

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Write the workflow** — on push to `main` (and manual `workflow_dispatch`): checkout, setup Node, `npm ci`, `npm run build:site`, then upload `site/` as the Pages artifact and deploy. Use the official `actions/configure-pages`, `actions/upload-pages-artifact@v3` (path `site`), and `actions/deploy-pages@v4`, with the required `permissions: {pages: write, id-token: write, contents: read}` and a `concurrency` group.
```yaml
name: Deploy site to Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build:site
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate YAML** — `node -e "require('fs').readFileSync('.github/workflows/pages.yml','utf8')"` (existence) and a YAML lint if available; otherwise eyeball indentation.

- [ ] **Step 3: Commit**
```bash
git add .github/workflows/pages.yml
git commit -m "ci: deploy microsite to GitHub Pages via Actions"
```

**Manual (post-merge, documented in report):** repo Settings → Pages → Source: **GitHub Actions**. The site will be at `https://meodai.github.io/astrobot/`.

---

### Task 6: Build + verify + finalize

- [ ] **Step 1: Fresh build + full suite**
```bash
npm ci && npm run build:site && npm test
```
Expected: bundle rebuilt; all tests pass (MVP 53 + Task 1 export tests + Task 2 bundle test).

- [ ] **Step 2: Confirm the committed bundle matches a fresh build** (no drift):
```bash
npm run build:site && git diff --exit-code site/astrobot.bundle.js && echo "bundle up to date"
```
If it differs, commit the rebuilt bundle.

- [ ] **Step 3: Clean tree + push branch**
```bash
git status -sb
git push -u origin build/phase2
```

---

## Self-Review

**Coverage:** portable mode (Task 1: renderer + CLI + README + tests); browser bundle reusing real engine (Task 2 + smoke test asserting Capricorn/Aries via the bundle); gallery of real example profiles (Task 3); interactive playground + gallery UI, vintage-celestial, honesty label on live persona (Task 4); Actions→Pages deploy (Task 5); build/verify/no-drift (Task 6). Matches the Phase 2 scope (playground + gallery + portable mode).

**No-dep constraint:** esbuild is devDependency-only; runtime stays zero-dep. Browser bundle imports only pure modules (no fs).

**Honesty:** live playground persona is labeled as templated; gallery holds the real LLM-authored personas.

**Known manual steps (not placeholders):** enabling Pages source = GitHub Actions (Task 5); the visual-design craft in Task 4 (delegated to the frontend-design skill, verified by manual open).
