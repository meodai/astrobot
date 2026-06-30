# astrobot Phase 3 — Cross-LLM compatibility

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Make astrobot usable from any LLM, not just Claude Code — without breaking the existing plugin. Three paths: (A) publish as an npm package so `npx @meodai/astrobot` works anywhere; (B) an `astrobot birth-prompt` command that lets any chat LLM author its persona; (C) an in-browser "make your own" flow on the microsite (no CLI).

**Coexistence invariant:** the Claude Code plugin must keep working unchanged. Plugin identity is `.claude-plugin/plugin.json` + `marketplace.json` (name `astrobot`), independent of `package.json` name. Skills/hooks auto-discover. `package.json` `"files"` scopes only the npm tarball, NOT the git repo/plugin install.

## Global Constraints

- CommonJS; engine stays zero-runtime-dep (vendored ephemeris). esbuild/astronomy-engine/@astrodraw remain devDependencies only.
- npm package name: **`@meodai/astrobot`** (bare `astrobot` is taken). `npx @meodai/astrobot <cmd>`.
- Do NOT break the plugin: leave `.claude-plugin/`, `skills/`, `hooks/`, `site/` in the repo; the npm `"files"` whitelist excludes them from the tarball but they stay in git.
- Birth stays roll-based + verbatim-reuse (no LLM free choice of sign/color).
- DRY: the browser flow reuses bundled engine functions; no reimplemented astrology.

---

### Task 1 (A): npm publish-ready package

**Files:** Modify `package.json`, `bin/astrobot.js` (shebang), `.claude-plugin/plugin.json` (version bump), `README.md`; Test `test/package.test.js`.

- [ ] **Step 1: `bin/astrobot.js` shebang** — add `#!/usr/bin/env node` as the VERY FIRST line (above the existing `// bin/astrobot.js` comment). Node ignores it; npx/global bin needs it.

- [ ] **Step 2: `package.json`** — set:
  - `"name": "@meodai/astrobot"`, `"version": "0.2.0"`
  - `"bin": { "astrobot": "bin/astrobot.js" }`
  - `"files": ["bin/", "lib/", "vendor/astronomy.js", "vendor/cities.json", "README.md"]`
  - `"engines": { "node": ">=18" }`, `"repository": {"type":"git","url":"https://github.com/meodai/astrobot.git"}`, `"homepage": "https://github.com/meodai/astrobot#readme"`, `"bugs": "https://github.com/meodai/astrobot/issues"`, `"keywords": ["astrology","llm","persona","claude","cli","chart"]`
  - keep `license`, `scripts`, `devDependencies`. (Remove `"private": true` if present so it can publish.)

- [ ] **Step 3: `.claude-plugin/plugin.json`** — bump `"version"` to `"0.2.0"` (signals an update to plugin users; everything else unchanged).

- [ ] **Step 4: `README.md`** — under "Use with other LLMs", add an npx block:
  ```
  npx @meodai/astrobot roll        # roll a random chart
  npx @meodai/astrobot birth-prompt # get a birth prompt for any LLM (Task 2)
  npx @meodai/astrobot export --model <id>   # print the persona block to paste
  ```
  And one line: "Publish with `npm publish --access public` (scoped public package)."

- [ ] **Step 5: `test/package.test.js`** — assert: `bin/astrobot.js` first line `=== '#!/usr/bin/env node'`; `package.json` `bin.astrobot === 'bin/astrobot.js'`, `name === '@meodai/astrobot'`, `files` includes `'lib/'` and `'bin/'` and the two vendor entries; NOT `private`.

- [ ] **Step 6: verify** — `npm pack --dry-run` shows the tarball contains bin/, lib/, vendor/astronomy.js, vendor/cities.json, README.md, package.json and EXCLUDES test/, site/, docs/, skills/, hooks/, .claude-plugin/. Then prove the plugin is intact: `test -f skills/astrobot/SKILL.md && test -f hooks/hooks.json && test -f .claude-plugin/plugin.json && echo plugin-intact`. Then `node bin/astrobot.js export --model x` runs (prints the no-identity line) and `npm test` passes.

- [ ] **Step 7: Commit** (`feat: publishable npm package (@meodai/astrobot) + npx; plugin unaffected`).

---

### Task 2 (B): `astrobot birth-prompt` (platform-agnostic birth)

**Files:** Create `lib/birthprompt.js`; Modify `bin/astrobot.js`; Test `test/birthprompt.test.js`; README note.

**Interface:** `renderBirthPrompt({ birth, colorHex, chart })` → a paste-able prompt string. `astrobot birth-prompt [--seed N]` rolls (real clock time when unseeded, per Task 12), computes the chart, prints the prompt.

- [ ] **Step 1: `lib/birthprompt.js`** — `renderBirthPrompt({birth, colorHex, chart})` returns a string that:
  1. shows a human chart summary — sun/moon/rising with glyphs + houses, dominant element/modality, and the color lore (`colorLore(colorHex)` → warm/cool, vivid/muted, planet, chakra, theosophy);
  2. instructs ANY LLM: "This is the chart you were born into (you did not choose it). Write a 2–3 sentence persona (~40–70 words, identity / color / self-note) that fits it; name the color (keep the exact hex); give 1–2 traits. No horoscope clichés. It shifts tone only.";
  3. gives the exact RETURN format — a JSON object pre-filled with the rolled `birth` and `colorHex`, with `persona`, `color.name`, `traits` to fill;
  4. closes with: "Then save it: pipe that JSON into `npx @meodai/astrobot birth --model <your-model-id>`."
  Import `colorLore` from `./colortone.js`, glyph helpers from `./glyphs.js`, `HOUSE_MEANINGS` from `./houses.js`.

- [ ] **Step 2: `bin/astrobot.js`** — add `birth-prompt` command: `const seeded = args.seed != null; const { birth, colorHex } = roll(seeded ? Number(args.seed) : undefined, seeded ? undefined : new Date()); const chart = computeChart(birth); return { code:0, out: renderBirthPrompt({birth, colorHex, chart}) + '\n' };`. Add to usage string.

- [ ] **Step 3: tests `test/birthprompt.test.js`** — `birth-prompt --seed 7` deterministic; output contains the sun sign, a house meaning, the color lore (planet/chakra), the literal `colorHex`, the birth `datetime`/`lat`, the words "tone only", and a `birth --model` instruction; the embedded JSON block is parseable after extracting it (or at least contains the rolled `datetime` and `colorHex`).

- [ ] **Step 4:** README — under "Use with other LLMs", document the loop: `birth-prompt` → paste into your LLM → it returns JSON → pipe to `birth`. Full suite passes. Commit (`feat: astrobot birth-prompt — birth any LLM into a rolled chart`).

---

### Task 3 (C): In-browser "make your own" (no CLI)

**Files:** Modify `site/src/engine.js` (export `renderPortableBlock`, `renderBirthPrompt`, `roll`-equivalent helpers as needed), `site/index.html`, `site/app.js`, `site/styles.css`. Controller rebuilds bundle.

**REQUIRED SUB-SKILL:** invoke `frontend-design` before restyling.

**Flow:** a "Make your own" panel that lets a visitor mint an identity for any LLM without a CLI:
1. **Roll** — randomize a birth (reuse the playground roll: random date/time + random city from `Astrobot.CITIES` + random color); compute the chart via `Astrobot.computeChart`.
2. **Birth prompt** — show a copyable textarea with `Astrobot.renderBirthPrompt({birth, colorHex, chart})` and a "Copy" button; instruct: paste into ChatGPT/Claude/Gemini.
3. **Paste reply** — a textarea for the LLM's JSON reply (`{persona, color:{name}, traits}` or the full object). Parse with `JSON.parse` inside try/catch; on failure show a friendly "couldn't read that — paste the JSON block" message.
4. **Result** — assemble the profile (`{birth, chart, color:{name, hex:colorHex}, persona, traits}`), compute today's mood (`Astrobot.composeMood(chart, new Date(), colorHex)`), render the copyable system-prompt block via `Astrobot.renderPortableBlock(profile, mood)` with a "Copy" button.
5. **Persist** — save the profile to `localStorage`; on return, restore it and re-render today's block (mood recomputed for the current day). A "start over" button clears it.

- [ ] **Step 1:** add `renderPortableBlock` and `renderBirthPrompt` to `site/src/engine.js` exports (both pure). Confirm `renderBirthPrompt` doesn't need `fs` (it takes the rolled data as args — the site supplies birth/color from its in-page roll using `Astrobot.CITIES`).
- [ ] **Step 2:** build the panel markup + the 4-step flow in `app.js` (reuse the existing roll-input helper; do not reimplement engine math). Escape any user-pasted text shown back as HTML.
- [ ] **Step 3:** styles consistent with the vintage-celestial design (frontend-design pass).
- [ ] **Step 4:** verify over HTTP (describe; real browser unavailable here): roll shows a birth prompt; pasting a sample JSON reply yields a copyable block; localStorage persists across reload. `npm run build:site`; `npm test` (no engine logic change → 94+).
- [ ] **Step 5:** Commit (`feat: microsite make-your-own — mint an astrobot for any LLM, no CLI`).
- [ ] **Step 6 (controller):** rebuild bundle + commit `site/astrobot.bundle.js`.

---

## Self-Review

Coverage: A (npx package, plugin-coexistence verified), B (birth-prompt closes the cross-platform birth gap), C (no-CLI in-browser minting). Plugin stays intact (files-whitelist scopes only the npm tarball; skills/hooks/.claude-plugin untouched). DRY (browser reuses bundled engine). Birth stays roll-based.
